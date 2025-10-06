'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
];

type Profile = {
  id: string;
  email: string | null;

  first_name: string | null;
  last_name: string | null;

  account_street: string | null;
  account_city: string | null;
  account_state: string | null;
  account_zipcode: string | null;

  delivery_same_as_account: boolean;
  delivery_street: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_zipcode: string | null;

  adults: number | null;
  teens: number | null;
  children: number | null;
  toddlers: number | null;

  portions_per_dinner: number | null;
  dinners_per_week: number | null;

  cooking_skill: string | null;
  cooking_time: string | null;
  equipment: string[] | null;
  other_equipment: string | null;

  allergies: string | null;
  dislikes: string | null;

  dietary_programs: string | null;
  macros: string | null;

  stores_near_me: string | null;
  preferred_store: string | null;
  organic_preference: string | null;
  brand_preference: string | null;

  onboarding_completed: boolean;
};

const empty: Omit<Profile, 'id' | 'onboarding_completed'> = {
  email: null,

  first_name: '',
  last_name: '',

  account_street: '',
  account_city: '',
  account_state: '',
  account_zipcode: '',

  delivery_same_as_account: true,
  delivery_street: '',
  delivery_city: '',
  delivery_state: '',
  delivery_zipcode: '',

  adults: 0,
  teens: 0,
  children: 0,
  toddlers: 0,

  portions_per_dinner: 4,
  dinners_per_week: 3,

  cooking_skill: 'Beginner',
  cooking_time: '30 min',
  equipment: [],
  other_equipment: '',

  allergies: '',
  dislikes: '',

  dietary_programs: '',
  macros: '',

  stores_near_me: '',
  preferred_store: '',
  organic_preference: 'Yes',
  brand_preference: 'Yes',
};

export default function AccountPage() {
  const router = useRouter();
  const search = useSearchParams();
  const forceEdit = search.get('edit') === '1';

  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);

  // 1) Read session & profile
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/auth?next=/account');
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.error('load profile error:', error);
      }

      // If row doesn’t exist (shouldn’t happen because of trigger), construct default
      const row = (data as Profile | null) ?? ({
        id: uid,
        onboarding_completed: false,
        ...empty,
        email: session.user.email ?? '',
      } as Profile);

      // Ensure arrays are always arrays
      row.equipment = Array.isArray(row.equipment) ? row.equipment : [];

      if (mounted) {
        setProfile(row);
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [router, supabase]);

  // helpers
  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    if (!profile) return;
    setProfile({ ...profile, [key]: value });
  }
  function setAddr(kind: 'account' | 'delivery', field: 'street'|'city'|'state'|'zipcode', val: string) {
    if (!profile) return;
    const map: Record<string, keyof Profile> = {
      account_street: 'account_street',
      account_city: 'account_city',
      account_state: 'account_state',
      account_zipcode: 'account_zipcode',
      delivery_street: 'delivery_street',
      delivery_city: 'delivery_city',
      delivery_state: 'delivery_state',
      delivery_zipcode: 'delivery_zipcode',
    };
    const key = `${kind}_${field}` as keyof typeof map;
    set(map[key], val as any);
  }
  function toggleEquip(item: string) {
    if (!profile) return;
    const arr = new Set(profile.equipment ?? []);
    if (arr.has(item)) arr.delete(item); else arr.add(item);
    set('equipment', Array.from(arr));
  }

  // 2) Save (UPSERT)
  async function saveProfile(nextAction?: 'finish') {
    if (!profile || !userId) return;
    setSaving(true);

    const payload: Partial<Profile> = {
      ...profile,
      id: userId,
      // If delivery is same, clear the separate fields to avoid confusion
      ...(profile.delivery_same_as_account ? {
        delivery_street: '',
        delivery_city: '',
        delivery_state: '',
        delivery_zipcode: '',
      } : {}),
      // Only mark completed when finishing
      onboarding_completed: nextAction === 'finish' ? true : profile.onboarding_completed,
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });

    setSaving(false);

    if (error) {
      alert('Save failed. Please try again.');
      console.error(error);
      return;
    }

    if (nextAction === 'finish') {
      router.replace('/dashboard');
    } else {
      alert('Saved!');
    }
  }

  // 3) Redirect users who already finished (unless ?edit=1)
  useEffect(() => {
    if (!loading && profile?.onboarding_completed && !forceEdit) {
      router.replace('/dashboard');
    }
  }, [loading, profile?.onboarding_completed, forceEdit, router]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-gray-500">Loading profile…</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat py-12 px-6"
      style={{ backgroundImage: "url('/hero.jpg')" }}
    >
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl max-w-4xl mx-auto p-8 space-y-10">
        <h1 className="text-3xl font-bold text-center">Account Profile</h1>

        {/* Basic Info */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Basic Info</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              placeholder="First Name"
              className="border rounded px-3 py-2"
              value={profile.first_name ?? ''}
              onChange={e => set('first_name', e.target.value)}
            />
            <input
              placeholder="Last Name"
              className="border rounded px-3 py-2"
              value={profile.last_name ?? ''}
              onChange={e => set('last_name', e.target.value)}
            />
          </div>
          <input
            placeholder="Email"
            className="w-full border rounded px-3 py-2 mt-4"
            value={profile.email ?? ''}
            onChange={e => set('email', e.target.value)}
          />
        </section>

        {/* Address */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Account Address</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              placeholder="Street address"
              className="border rounded px-3 py-2"
              value={profile.account_street ?? ''}
              onChange={e => setAddr('account','street', e.target.value)}
            />
            <input
              placeholder="City"
              className="border rounded px-3 py-2"
              value={profile.account_city ?? ''}
              onChange={e => setAddr('account','city', e.target.value)}
            />
            <input
              placeholder="State"
              className="border rounded px-3 py-2"
              value={profile.account_state ?? ''}
              onChange={e => setAddr('account','state', e.target.value)}
            />
            <input
              placeholder="Zipcode"
              className="border rounded px-3 py-2"
              value={profile.account_zipcode ?? ''}
              onChange={e => setAddr('account','zipcode', e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 mt-3">
            <input
              type="checkbox"
              checked={!!profile.delivery_same_as_account}
              onChange={e => set('delivery_same_as_account', e.target.checked)}
            />
            Delivery address is the same as account address
          </label>

          {!profile.delivery_same_as_account && (
            <div className="grid md:grid-cols-2 gap-4 mt-3">
              <input
                placeholder="Street address"
                className="border rounded px-3 py-2"
                value={profile.delivery_street ?? ''}
                onChange={e => setAddr('delivery','street', e.target.value)}
              />
              <input
                placeholder="City"
                className="border rounded px-3 py-2"
                value={profile.delivery_city ?? ''}
                onChange={e => setAddr('delivery','city', e.target.value)}
              />
              <input
                placeholder="State"
                className="border rounded px-3 py-2"
                value={profile.delivery_state ?? ''}
                onChange={e => setAddr('delivery','state', e.target.value)}
              />
              <input
                placeholder="Zipcode"
                className="border rounded px-3 py-2"
                value={profile.delivery_zipcode ?? ''}
                onChange={e => setAddr('delivery','zipcode', e.target.value)}
              />
            </div>
          )}
        </section>

        {/* Household */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Tell us who you are cooking for</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <NumberBox label="Adults (18+)" value={profile.adults ?? 0} onChange={v => set('adults', v)} />
            <NumberBox label="Teens (13–17)" value={profile.teens ?? 0} onChange={v => set('teens', v)} />
            <NumberBox label="Children (5–12)" value={profile.children ?? 0} onChange={v => set('children', v)} />
            <NumberBox label="Toddlers/Infants (0–4)" value={profile.toddlers ?? 0} onChange={v => set('toddlers', v)} />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <NumberBox
              label="How many portions per dinner?"
              min={1}
              value={profile.portions_per_dinner ?? 4}
              onChange={v => set('portions_per_dinner', v)}
            />
            <NumberBox
              label="How many days do you want to buy and prepare Dinner for this week?"
              min={1}
              max={7}
              value={profile.dinners_per_week ?? 3}
              onChange={v => set('dinners_per_week', v)}
            />
          </div>
        </section>

        {/* Cooking prefs */}
        <section className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Cooking Skill</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={profile.cooking_skill ?? 'Beginner'}
              onChange={e => set('cooking_skill', e.target.value)}
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Cooking Time Preference</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={profile.cooking_time ?? '30 min'}
              onChange={e => set('cooking_time', e.target.value)}
            >
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
                <input
                  type="checkbox"
                  checked={(profile.equipment ?? []).includes(opt)}
                  onChange={() => toggleEquip(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
          <input
            placeholder="Other equipment (e.g., Spiralizer, Mandoline)"
            className="w-full border rounded px-3 py-2 mt-3"
            value={profile.other_equipment ?? ''}
            onChange={e => set('other_equipment', e.target.value)}
          />
        </section>

        {/* Allergies / dietary */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Allergies & Restrictions</h2>
          <p className="text-sm text-gray-600 mb-2">
            While we try to accommodate all dietary requests, ALWAYS review your purchase order to ensure ingredients meet your dietary criteria.
            Examples: Dairy, Gluten, Shellfish, Soy, Peanuts.
          </p>
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={2}
            value={profile.allergies ?? ''}
            onChange={e => set('allergies', e.target.value)}
          />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Dietary Programs & Macros</h2>
          <input
            className="w-full border rounded px-3 py-2 mb-3"
            placeholder="Dietary programs or rules"
            value={profile.dietary_programs ?? ''}
            onChange={e => set('dietary_programs', e.target.value)}
          />
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={2}
            placeholder="Macro targets (Calories, Protein, Carbs, Fat, Fiber, Sugar, Sodium)"
            value={profile.macros ?? ''}
            onChange={e => set('macros', e.target.value)}
          />
        </section>

        {/* Shopping */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Shopping & Stores</h2>
          <input
            className="w-full border rounded px-3 py-2 mb-3"
            placeholder="Stores Near Me"
            value={profile.stores_near_me ?? ''}
            onChange={e => set('stores_near_me', e.target.value)}
          />
          <input
            className="w-full border rounded px-3 py-2 mb-3"
            placeholder="Select which grocery store are we going to shop from this week?"
            value={profile.preferred_store ?? ''}
            onChange={e => set('preferred_store', e.target.value)}
          />
          <label className="block mb-2">Do you prefer to shop organic when possible?</label>
          <select
            className="w-full border rounded px-3 py-2 mb-4"
            value={profile.organic_preference ?? 'Yes'}
            onChange={e => set('organic_preference', e.target.value)}
          >
            <option>Yes</option>
            <option>No</option>
            <option>I dont care</option>
          </select>

          <label className="block mb-2">Do you prefer national and regional brands over store brands?</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={profile.brand_preference ?? 'Yes'}
            onChange={e => set('brand_preference', e.target.value)}
          >
            <option>Yes</option>
            <option>No</option>
            <option>No preference</option>
          </select>
        </section>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            disabled={saving}
            onClick={() => saveProfile()}
            className="px-5 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>

          <button
            disabled={saving}
            onClick={() => saveProfile('finish')}
            className="px-5 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Finish & Go to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberBox({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <input
        type="number"
        className="w-full border rounded px-3 py-2"
        value={value ?? 0}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isFinite(v)) return;
          if (min != null && v < min) return onChange(min);
          if (max != null && v > max) return onChange(max);
          onChange(v);
        }}
      />
    </div>
  );
}
