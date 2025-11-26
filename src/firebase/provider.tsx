'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import type { Employee } from '@/lib/types';


// User permissions
export interface UserPermissions {
    isAdmin: boolean;
    screens: string[];
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  permissions: UserPermissions;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState extends UserAuthState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser extends UserAuthState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult extends UserAuthState {}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    permissions: { isAdmin: false, screens: [] },
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth || !firestore) { 
      setUserAuthState({ user: null, permissions: { isAdmin: false, screens: [] }, isUserLoading: false, userError: new Error("Auth or Firestore service not provided.") });
      return;
    }

    setUserAuthState({ user: null, permissions: { isAdmin: false, screens: [] }, isUserLoading: true, userError: null }); // Reset on auth instance change

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => { // Auth state determined
        if (firebaseUser) {
            // Special check for the hardcoded admin user
            if (firebaseUser.email === 'admin@hr-pulse.system') {
                setUserAuthState({ 
                    user: firebaseUser, 
                    permissions: { isAdmin: true, screens: [] }, 
                    isUserLoading: false, 
                    userError: null 
                });
                return; // Stop further checks for the admin
            }
            
            // For regular users, fetch their employee document to get permissions
            const employeeDocRef = doc(firestore, 'employees', firebaseUser.uid);
            try {
                const employeeSnap = await getDoc(employeeDocRef).catch(e => {
                    const contextualError = new FirestorePermissionError({ operation: 'get', path: employeeDocRef.path });
                    errorEmitter.emit('permission-error', contextualError);
                    throw e; // re-throw original error
                });
                
                let userPermissions: UserPermissions = { isAdmin: false, screens: [] };

                if (employeeSnap.exists()) {
                    const employeeData = employeeSnap.data() as Employee;
                    userPermissions.screens = employeeData.permissions || [];
                }

                setUserAuthState({ user: firebaseUser, permissions: userPermissions, isUserLoading: false, userError: null });
            } catch (error) {
                console.error("FirebaseProvider: Error fetching user permissions:", error);
                // Set default (non-privileged) permissions on error
                 setUserAuthState({ user: firebaseUser, permissions: { isAdmin: false, screens: [] }, isUserLoading: false, userError: error as Error });
            }
        } else {
            setUserAuthState({ user: null, permissions: { isAdmin: false, screens: [] }, isUserLoading: false, userError: null });
        }
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, permissions: { isAdmin: false, screens: [] }, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [auth, firestore]); // Depends on the auth instance

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      ...userAuthState
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    permissions: context.permissions,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, permissions, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const { user, permissions, isUserLoading, userError } = useFirebase();
  return { user, permissions, isUserLoading, userError };
};

// Add this interface to define the props for FirebaseProvider
interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}
