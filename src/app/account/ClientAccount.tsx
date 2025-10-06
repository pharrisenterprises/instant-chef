'use client';

import { useEffect, useState } from 'react';

const equipmentOptions = [/* ... keep your list exactly as you have it ... */];

export default function ClientAccount({ defaultEmail = '' }: { defaultEmail?: string }) {
  const [profile, setProfile] = useState<any>({
    firstName: '',
    lastName: '',
    email: '',
    address: { street: '', city: '', state: '', zipcode: '' },
    deliverySameAsAccount: true,
    deliveryAddress: { street: '', city: '', state: '', zipcode: '' },
    adults: 2,
    teens: 0,
    children: 0,
    toddlers: 0,
    portionsPerMeal: 4,
    dinnersPerWeek: 3,
    cookingSkill: 'Beginner',
    cookingTime: '30 min',
    equipment: [] as string[],
    otherEquipment: '',
    allergies: '',
    dislikes: '',
    dietaryPrograms: '',
    macros: '',
    storesNearby: '',
    preferredStore: '',
    organicPreference: 'I dont care',
    brandPreference: 'I dont care',
  });

  // Load from localStorage on first mount
  useEffect(() => {
    const raw = localStorage.getItem('accountProfile');
    if (raw) {
      setProfile(JSON.parse(raw));
    } else if (defaultEmail) {
      // seed email from Supabase user if first time
      setProfile(prev => ({ ...prev, email: defaultEmail }));
    }
  }, [defaultEmail]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('accountProfile', JSON.stringify(profile));
  }, [profile]);

  function handleChange(field: string, value: any) {
    setProfile((prev: any) => ({ ...prev, [field]: value }));
  }

  function handleAddressChange(type: 'address' | 'deliveryAddress', field: string, value: string) {
    setProfile((prev: any) => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
  }

  function toggleEquipment(item: string) {
    setProfile((prev: any) => {
      const exists = prev.equipment.includes(item);
      return { ...prev, equipment: exists ? prev.equipment.filter((i: string) => i !== item) : [...prev.equipment, item] };
    });
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat py-12 px-6" style={{ backgroundImage: "url('/hero.jpg')" }}>
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl max-w-4xl mx-auto p-8 space-y-10">
        <h1 className="text-3xl font-bold text-center">Account Profile</h1>
        {/* --- keep the rest of your JSX exactly as you have it --- */}
      </div>
    </div>
  );
}
