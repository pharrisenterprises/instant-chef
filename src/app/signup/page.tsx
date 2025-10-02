'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const equipmentOptions = [
  'Air fryer',
  'Instant Pot',
  'Slow Cooker',
  'Sous Vide',
  'Cast Iron',
  'Smoker',
  'Stick Blender',
  'Cuisinart',
  'Kitchen Aid',
  'Vitamix or High Speed Blender (Ninja)',
  'Fryer',
]

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

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
  })

  function handleChange(field: string, value: any) {
    setProfile((prev: any) => ({ ...prev, [field]: value }))
  }

  function handleAddressChange(type: 'address' | 'deliveryAddress', field: string, value: string) {
    setProfile((prev: any) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }))
  }

  function toggleEquipment(item: string) {
    setProfile((prev: any) => {
      const exists = prev.equipment.includes(item)
      return {
        ...prev,
        equipment: exists ? prev.equipment.filter((i: string) => i !== item) : [...prev.equipment, item],
      }
    })
  }

  function finishSignup() {
    localStorage.setItem('accountProfile', JSON.stringify(profile))
    localStorage.setItem('plan', 'trial')
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6 py-12">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Account Setup Wizard</h1>

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <input placeholder="First Name" className="border rounded px-3 py-2" value={profile.firstName} onChange={e => handleChange('firstName', e.target.value)} />
              <input placeholder="Last Name" className="border rounded px-3 py-2" value={profile.lastName} onChange={e => handleChange('lastName', e.target.value)} />
            </div>
            <input type="email" placeholder="Email" className="w-full border rounded px-3 py-2" value={profile.email} onChange={e => handleChange('email', e.target.value)} />
            <h3 className="font-semibold mt-4">Account Address</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <input placeholder="Street address" className="border rounded px-3 py-2" value={profile.address.street} onChange={e => handleAddressChange('address', 'street', e.target.value)} />
              <input placeholder="City" className="border rounded px-3 py-2" value={profile.address.city} onChange={e => handleAddressChange('address', 'city', e.target.value)} />
              <input placeholder="State" className="border rounded px-3 py-2" value={profile.address.state} onChange={e => handleAddressChange('address', 'state', e.target.value)} />
              <input placeholder="Zipcode" className="border rounded px-3 py-2" value={profile.address.zipcode} onChange={e => handleAddressChange('address', 'zipcode', e.target.value)} />
            </div>
            <label className="flex items-center gap-2 mt-3">
              <input type="checkbox" checked={profile.deliverySameAsAccount} onChange={e => handleChange('deliverySameAsAccount', e.target.checked)} />
              Delivery address is the same as account address
            </label>
            {!profile.deliverySameAsAccount && (
              <div className="grid md:grid-cols-2 gap-4 mt-3">
                <input placeholder="Street address" className="border rounded px-3 py-2" value={profile.deliveryAddress.street} onChange={e => handleAddressChange('deliveryAddress', 'street', e.target.value)} />
                <input placeholder="City" className="border rounded px-3 py-2" value={profile.deliveryAddress.city} onChange={e => handleAddressChange('deliveryAddress', 'city', e.target.value)} />
                <input placeholder="State" className="border rounded px-3 py-2" value={profile.deliveryAddress.state} onChange={e => handleAddressChange('deliveryAddress', 'state', e.target.value)} />
                <input placeholder="Zipcode" className="border rounded px-3 py-2" value={profile.deliveryAddress.zipcode} onChange={e => handleAddressChange('deliveryAddress', 'zipcode', e.target.value)} />
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button onClick={() => setStep(2)} className="bg-green-500 text-white px-6 py-2 rounded">Next →</button>
            </div>
          </div>
        )}

        {/* STEP 2: Household */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Household Setup</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div><label>Adults (18+)</label><input type="number" min={0} className="w-full border rounded px-2 py-1" value={profile.adults} onChange={e => handleChange('adults', +e.target.value)} /></div>
              <div><label>Teens (13–17)</label><input type="number" min={0} className="w-full border rounded px-2 py-1" value={profile.teens} onChange={e => handleChange('teens', +e.target.value)} /></div>
              <div><label>Children (5–12)</label><input type="number" min={0} className="w-full border rounded px-2 py-1" value={profile.children} onChange={e => handleChange('children', +e.target.value)} /></div>
              <div><label>Toddlers/Infants (0–4)</label><input type="number" min={0} className="w-full border rounded px-2 py-1" value={profile.toddlers} onChange={e => handleChange('toddlers', +e.target.value)} /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label>How many portions per dinner?</label><input type="number" min={1} className="w-full border rounded px-2 py-1" value={profile.portionsPerMeal} onChange={e => handleChange('portionsPerMeal', +e.target.value)} /></div>
              <div><label>Dinners per week?</label><input type="number" min={1} max={7} className="w-full border rounded px-2 py-1" value={profile.dinnersPerWeek} onChange={e => handleChange('dinnersPerWeek', +e.target.value)} /></div>
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-200 rounded">← Back</button>
              <button onClick={() => setStep(3)} className="px-4 py-2 bg-green-500 text-white rounded">Next →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Cooking Preferences */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Cooking Preferences</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label>Cooking Skill</label>
                <select className="w-full border rounded px-2 py-1" value={profile.cookingSkill} onChange={e => handleChange('cookingSkill', e.target.value)}>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
              <div>
                <label>Cooking Time Preference</label>
                <select className="w-full border rounded px-2 py-1" value={profile.cookingTime} onChange={e => handleChange('cookingTime', e.target.value)}>
                  <option>15 min</option>
                  <option>30 min</option>
                  <option>45 min</option>
                  <option>60+ min</option>
                </select>
              </div>
            </div>
            <h3 className="font-semibold mt-4">Equipment</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {equipmentOptions.map(opt => (
                <label key={opt} className="flex items-center gap-2">
                  <input type="checkbox" checked={profile.equipment.includes(opt)} onChange={() => toggleEquipment(opt)} /> {opt}
                </label>
              ))}
            </div>
            <input placeholder="Other equipment" className="w-full border rounded px-2 py-1 mt-2" value={profile.otherEquipment} onChange={e => handleChange('otherEquipment', e.target.value)} />
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(2)} className="px-4 py-2 bg-gray-200 rounded">← Back</button>
              <button onClick={() => setStep(4)} className="px-4 py-2 bg-green-500 text-white rounded">Next →</button>
            </div>
          </div>
        )}

        {/* STEP 4: Dietary */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Dietary Profile</h2>
            <p className="text-sm text-gray-600">
              While we try to accommodate dietary requests, ALWAYS review purchase orders to ensure ingredients meet your criteria.  
              Examples: Dairy, Gluten, Shellfish, Soy, Peanuts.
            </p>
            <textarea className="w-full border rounded px-2 py-1" rows={2} placeholder="Allergies & Restrictions" value={profile.allergies} onChange={e => handleChange('allergies', e.target.value)} />
            <textarea className="w-full border rounded px-2 py-1" rows={2} placeholder="Dislikes / Avoid List" value={profile.dislikes} onChange={e => handleChange('dislikes', e.target.value)} />
            <input className="w-full border rounded px-2 py-1" placeholder="Dietary programs (Keto, Paleo, Diabetic, etc.)" value={profile.dietaryPrograms} onChange={e => handleChange('dietaryPrograms', e.target.value)} />
            <textarea className="w-full border rounded px-2 py-1" rows={2} placeholder="Macro targets (Calories, Protein, Carbs, Fat, etc.)" value={profile.macros} onChange={e => handleChange('macros', e.target.value)} />
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(3)} className="px-4 py-2 bg-gray-200 rounded">← Back</button>
              <button onClick={() => setStep(5)} className="px-4 py-2 bg-green-500 text-white rounded">Next →</button>
            </div>
          </div>
        )}

        {/* STEP 5: Shopping */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Shopping Preferences</h2>
            <input className="w-full border rounded px-2 py-1" placeholder="Stores Near Me" value={profile.storesNearby} onChange={e => handleChange('storesNearby', e.target.value)} />
            <input className="w-full border rounded px-2 py-1" placeholder="Preferred Grocery Store" value={profile.preferredStore} onChange={e => handleChange('preferredStore', e.target.value)} />
            <label>"Do you prefer to shop organic when possible?"</label>
            <select className="w-full border rounded px-2 py-1" value={profile.organicPreference} onChange={e => handleChange('organicPreference', e.target.value)}>
              <option>Yes</option>
              <option>I dont care</option>
            </select>
            <label>"Do you prefer national and regional brands over store brands?"</label>
            <select className="w-full border rounded px-2 py-1" value={profile.brandPreference} onChange={e => handleChange('brandPreference', e.target.value)}>
              <option>Yes</option>
              <option>I dont care</option>
            </select>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(4)} className="px-4 py-2 bg-gray-200 rounded">← Back</button>
              <button onClick={finishSignup} className="px-4 py-2 bg-green-500 text-white rounded">Finish & Go to Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
