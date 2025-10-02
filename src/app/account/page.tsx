'use client'

import { useState, useEffect } from 'react'

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

export default function AccountPage() {
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

  useEffect(() => {
    const raw = localStorage.getItem('accountProfile')
    if (raw) setProfile(JSON.parse(raw))
  }, [])

  useEffect(() => {
    localStorage.setItem('accountProfile', JSON.stringify(profile))
  }, [profile])

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

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat py-12 px-6"
      style={{ backgroundImage: "url('/hero.jpg')" }}
    >
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl max-w-4xl mx-auto p-8 space-y-10">
        <h1 className="text-3xl font-bold text-center">Account Profile</h1>

        {/* Name, Email */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Basic Info</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input placeholder="First Name" className="border rounded px-3 py-2" value={profile.firstName} onChange={e => handleChange('firstName', e.target.value)} />
            <input placeholder="Last Name" className="border rounded px-3 py-2" value={profile.lastName} onChange={e => handleChange('lastName', e.target.value)} />
          </div>
          <input type="email" placeholder="Email" className="w-full border rounded px-3 py-2 mt-4" value={profile.email} onChange={e => handleChange('email', e.target.value)} />
        </section>

        {/* Address */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Account Address</h2>
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
        </section>

        {/* Household */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Tell us who you are cooking for</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-1">Adults (18+)</label>
              <input type="number" min={0} className="w-full border rounded px-3 py-2" value={profile.adults} onChange={e => handleChange('adults', +e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Teens (13–17)</label>
              <input type="number" min={0} className="w-full border rounded px-3 py-2" value={profile.teens} onChange={e => handleChange('teens', +e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Children (5–12)</label>
              <input type="number" min={0} className="w-full border rounded px-3 py-2" value={profile.children} onChange={e => handleChange('children', +e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Toddlers/Infants (0–4)</label>
              <input type="number" min={0} className="w-full border rounded px-3 py-2" value={profile.toddlers} onChange={e => handleChange('toddlers', +e.target.value)} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm mb-1">How many portions do you want to plan for each dinner?</label>
              <input type="number" min={1} className="w-full border rounded px-3 py-2" value={profile.portionsPerMeal} onChange={e => handleChange('portionsPerMeal', +e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">How many days do you want to buy and prepare Dinner for this week?</label>
              <input type="number" min={1} max={7} className="w-full border rounded px-3 py-2" value={profile.dinnersPerWeek} onChange={e => handleChange('dinnersPerWeek', +e.target.value)} />
            </div>
          </div>
        </section>

        {/* Cooking skill/time */}
        <section className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Cooking Skill</label>
            <select className="w-full border rounded px-3 py-2" value={profile.cookingSkill} onChange={e => handleChange('cookingSkill', e.target.value)}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Cooking Time Preference</label>
            <select className="w-full border rounded px-3 py-2" value={profile.cookingTime} onChange={e => handleChange('cookingTime', e.target.value)}>
              <option>15 min</option>
              <option>30 min</option>
              <option>45 min</option>
              <option>60+ min</option>
            </select>
          </div>
        </section>

        {/* Equipment */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Equipment</h2>
          <div className="grid md:grid-cols-2 gap-2">
            {equipmentOptions.map(opt => (
              <label key={opt} className="flex items-center gap-2">
                <input type="checkbox" checked={profile.equipment.includes(opt)} onChange={() => toggleEquipment(opt)} />
                {opt}
              </label>
            ))}
          </div>
          <input placeholder="Other equipment (e.g., Spiralizer, Mandoline)" className="w-full border rounded px-3 py-2 mt-3" value={profile.otherEquipment} onChange={e => handleChange('otherEquipment', e.target.value)} />
        </section>

        {/* Allergies */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Allergies & Restrictions</h2>
          <p className="text-sm text-gray-600 mb-2">
            While we try to accommodate all dietary requests, ALWAYS review your purchase order to ensure ingredients meet your dietary criteria.  
            Examples: Dairy, Gluten, Shellfish, Soy, Peanuts.  
            If in doubt, leave it out and manually remove it from your purchase order.
          </p>
          <textarea className="w-full border rounded px-3 py-2" rows={2} value={profile.allergies} onChange={e => handleChange('allergies', e.target.value)} />
        </section>

        {/* Dietary programs */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Dietary Programs & Macros</h2>
          <p className="text-sm text-gray-600 mb-2">
            Examples: Keto, Paleo, Gluten Free, Diabetic, Heart Healthy, Colon Cleanse.
          </p>
          <input className="w-full border rounded px-3 py-2 mb-3" placeholder="Dietary programs or rules" value={profile.dietaryPrograms} onChange={e => handleChange('dietaryPrograms', e.target.value)} />
          <textarea className="w-full border rounded px-3 py-2" rows={2} placeholder="Macro targets (Calories, Protein, Carbs, Fat, Fiber, Sugar, Sodium)" value={profile.macros} onChange={e => handleChange('macros', e.target.value)} />
        </section>

        {/* Stores */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Shopping & Stores</h2>
          <input className="w-full border rounded px-3 py-2 mb-3" placeholder="Stores Near Me" value={profile.storesNearby} onChange={e => handleChange('storesNearby', e.target.value)} />
          <input className="w-full border rounded px-3 py-2 mb-3" placeholder="Select which grocery store are we going to shop from this week?" value={profile.preferredStore} onChange={e => handleChange('preferredStore', e.target.value)} />
          <label className="block mb-2">"Do you prefer to shop organic when possible?"</label>
          <select className="w-full border rounded px-3 py-2 mb-4" value={profile.organicPreference} onChange={e => handleChange('organicPreference', e.target.value)}>
            <option>Yes</option>
            <option>I dont care</option>
          </select>
          <label className="block mb-2">"Do you prefer national and regional brands over store brands?"</label>
          <select className="w-full border rounded px-3 py-2" value={profile.brandPreference} onChange={e => handleChange('brandPreference', e.target.value)}>
            <option>Yes</option>
            <option>I dont care</option>
          </select>
        </section>
      </div>
    </div>
  )
}
