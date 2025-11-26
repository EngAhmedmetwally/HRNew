'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { errorEmitter, FirestorePermissionError } from '@/firebase';


interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// User roles
export interface UserRoles {
    isAdmin: boolean;
    isHr: boolean;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  roles: UserRoles;
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
    roles: { isAdmin: false, isHr: false },
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth || !firestore) { 
      setUserAuthState({ user: null, roles: { isAdmin: false, isHr: false }, isUserLoading: false, userError: new Error("Auth or Firestore service not provided.") });
      return;
    }

    setUserAuthState({ user: null, roles: { isAdmin: false, isHr: false }, isUserLoading: true, userError: null }); // Reset on auth instance change

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => { // Auth state determined
        if (firebaseUser) {
            // Special check for the hardcoded admin user
            if (firebaseUser.email === 'admin@hr-pulse.system') {
                setUserAuthState({ 
                    user: firebaseUser, 
                    roles: { isAdmin: true, isHr: true }, 
                    isUserLoading: false, 
                    userError: null 
                });
                return; // Stop further checks for the admin
            }
            
            // For custom DB auth, the doc ID is temporarily attached to the user object
            const employeeIdToCheck = (firebaseUser as any).firestoreDocId || firebaseUser.uid;

            // For all other users, fetch roles from Firestore
            const adminRoleRef = doc(firestore, 'roles_admin', employeeIdToCheck);
            const hrRoleRef = doc(firestore, 'roles_hr', employeeIdToCheck);
            try {
                const [adminSnap, hrSnap] = await Promise.all([
                    getDoc(adminRoleRef).catch(e => {
                        const contextualError = new FirestorePermissionError({ operation: 'get', path: adminRoleRef.path });
                        errorEmitter.emit('permission-error', contextualError);
                        throw e; // re-throw original error
                    }),
                    getDoc(hrRoleRef).catch(e => {
                        const contextualError = new FirestorePermissionError({ operation: 'get', path: hrRoleRef.path });
                        errorEmitter.emit('permission-error', contextualError);
                        throw e; // re-throw original error
                    })
                ]);
                const roles = {
                    isAdmin: adminSnap.exists(),
                    isHr: hrSnap.exists()
                };
                
                // An admin should also have HR privileges
                if (roles.isAdmin) {
                    roles.isHr = true;
                }

                setUserAuthState({ user: firebaseUser, roles, isUserLoading: false, userError: null });
            } catch (error) {
                console.error("FirebaseProvider: Error fetching user roles:", error);
                // Set default (non-privileged) roles on error
                 setUserAuthState({ user: firebaseUser, roles: { isAdmin: false, isHr: false }, isUserLoading: false, userError: error as Error });
            }
        } else {
            setUserAuthState({ user: null, roles: { isAdmin: false, isHr: false }, isUserLoading: false, userError: null });
        }
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, roles: { isAdmin: false, isHr: false }, isUserLoading: false, userError: error });
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
    roles: context.roles,
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
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const { user, roles, isUserLoading, userError } = useFirebase();
  return { user, roles, isUserLoading, userError };
};
