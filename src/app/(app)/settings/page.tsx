'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, PlusCircle, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DeductionLevel {
  id: string;
  minutes: number;
  deductionType: 'minutes' | 'hours' | 'amount';
  deductionValue: number;
}

export default function SettingsPage() {
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    checkInTime: '09:00',
    checkOutTime: '17:00',
    qrRefreshRate: 60,
    gracePeriod: 15,
    locationLat: '24.7136',
    locationLng: '46.6753',
    allowedRadius: 500,
  });

  const [deductionLevels, setDeductionLevels] = useState<DeductionLevel[]>([
      { id: '1', minutes: 30, deductionType: 'minutes', deductionValue: 30 },
      { id: '2', minutes: 60, deductionType: 'hours', deductionValue: 1 },
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleLevelChange = (id: string, field: keyof Omit<DeductionLevel, 'id' | 'deductionType'>, value: string | number) => {
    setDeductionLevels(levels => levels.map(level => 
      level.id === id ? { ...level, [field]: Number(value) } : level
    ));
  };

  const handleLevelTypeChange = (id: string, value: 'minutes' | 'hours' | 'amount') => {
      setDeductionLevels(levels => levels.map(level =>
          level.id === id ? { ...level, deductionType: value } : level
      ));
  };

  const addLevel = () => {
    setDeductionLevels(levels => [
      ...levels,
      { id: Date.now().toString(), minutes: 0, deductionType: 'minutes', deductionValue: 0 }
    ]);
  };

  const removeLevel = (id: string) => {
    setDeductionLevels(levels => levels.filter(level => level.id !== id));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // In a real app, you would save these settings to a database.
    console.log({ settings, deductionLevels });
    toast({
      title: 'تم حفظ الإعدادات',
      description: 'تم تحديث إعدادات النظام بنجاح.',
    });
  };

  const getDeductionUnit = (type: 'minutes' | 'hours' | 'amount') => {
    switch (type) {
      case 'minutes': return 'دقيقة';
      case 'hours': return 'ساعة';
      case 'amount': return 'جنيه';
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">إدارة الإعدادات</h2>
        <p className="text-muted-foreground">
          إدارة إعدادات النظام وسياسات الحضور والرواتب.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الحضور العامة</CardTitle>
              <CardDescription>
                تحديد أوقات العمل الرسمية وسياسات الحضور.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="checkInTime">وقت الحضور العام</Label>
                <Input
                  id="checkInTime"
                  name="checkInTime"
                  type="time"
                  value={settings.checkInTime}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutTime">وقت الانصراف العام</Label>
                <Input
                  id="checkOutTime"
                  name="checkOutTime"
                  type="time"
                  value={settings.checkOutTime}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>إعدادات QR Code والموقع</CardTitle>
              <CardDescription>
                تكوين سلوك رمز الاستجابة السريعة وتحديد الموقع.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qrRefreshRate">
                  تحديث الـ QR Code كل (بالثواني)
                </Label>
                <Input
                  id="qrRefreshRate"
                  name="qrRefreshRate"
                  type="number"
                  value={settings.qrRefreshRate}
                  onChange={handleInputChange}
                  min="10"
                />
              </div>
               <div className='grid grid-cols-2 gap-4'>
                <div className="space-y-2">
                    <Label htmlFor="locationLat">خط العرض</Label>
                    <Input
                      id="locationLat"
                      name="locationLat"
                      type="text"
                      value={settings.locationLat}
                      onChange={handleInputChange}
                      placeholder="e.g., 24.7136"
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="locationLng">خط الطول</Label>
                    <Input
                      id="locationLng"
                      name="locationLng"
                      type="text"
                      value={settings.locationLng}
                      onChange={handleInputChange}
                      placeholder="e.g., 46.6753"
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowedRadius">
                  النطاق المسموح به (بالمتر)
                </Label>
                <Input
                  id="allowedRadius"
                  name="allowedRadius"
                  type="number"
                  value={settings.allowedRadius}
                  onChange={handleInputChange}
                  min="50"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>لائحة التأخير</CardTitle>
              <CardDescription>
                إعداد قواعد الخصم بناءً على دقائق التأخير بعد فترة السماح.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="gracePeriod">فترة السماح (بالدقائق)</Label>
                    <Input
                      id="gracePeriod"
                      name="gracePeriod"
                      type="number"
                      value={settings.gracePeriod}
                      onChange={(e) => setSettings(prev => ({...prev, gracePeriod: parseInt(e.target.value, 10)}))}
                      min="0"
                    />
                     <p className="text-xs text-muted-foreground">
                        عدد الدقائق المسموح بها قبل بدء حساب التأخير.
                    </p>
                </div>
                
                <div className="space-y-4">
                    <Label>مستويات الخصم</Label>
                    {deductionLevels.map((level, index) => (
                        <div key={level.id} className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4 border rounded-md items-end">
                            <div className="space-y-2 sm:col-span-1 md:col-span-1">
                                <Label htmlFor={`minutes-${level.id}`} className="text-xs">بعد (كم دقيقة تأخير)</Label>
                                <Input 
                                    id={`minutes-${level.id}`}
                                    type="number"
                                    value={level.minutes}
                                    onChange={(e) => handleLevelChange(level.id, 'minutes', e.target.value)}
                                    placeholder="مثال: 30"
                                />
                            </div>
                             <div className="space-y-2 sm:col-span-2 md:col-span-1">
                                <Label htmlFor={`deductionType-${level.id}`} className="text-xs">نوع الخصم</Label>
                                 <Select
                                    value={level.deductionType}
                                    onValueChange={(value: 'minutes' | 'hours' | 'amount') => handleLevelTypeChange(level.id, value)}
                                >
                                    <SelectTrigger id={`deductionType-${level.id}`}>
                                        <SelectValue placeholder="اختر النوع" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="minutes">دقائق</SelectItem>
                                        <SelectItem value="hours">ساعات</SelectItem>
                                        <SelectItem value="amount">مبلغ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 sm:col-span-2 md:col-span-1">
                                <Label htmlFor={`deductionValue-${level.id}`} className="text-xs">قيمة الخصم ({getDeductionUnit(level.deductionType)})</Label>
                                <Input 
                                    id={`deductionValue-${level.id}`}
                                    type="number"
                                    value={level.deductionValue}
                                    onChange={(e) => handleLevelChange(level.id, 'deductionValue', e.target.value)}
                                    placeholder="القيمة"
                                />
                            </div>
                            <div className="sm:col-span-1 md:col-span-1 flex items-end">
                                <Button variant="destructive" size="icon" onClick={() => removeLevel(level.id)} type="button">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">إزالة المستوى</span>
                                </Button>
                            </div>
                        </div>
                    ))}
                     <Button variant="outline" size="sm" onClick={addLevel} type="button">
                        <PlusCircle className="ml-2 h-4 w-4" />
                        إضافة مستوى خصم جديد
                    </Button>
                </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit">
            <Save className="ml-2 h-4 w-4" />
            حفظ التغييرات
          </Button>
        </div>
      </form>
    </div>
  );
}
