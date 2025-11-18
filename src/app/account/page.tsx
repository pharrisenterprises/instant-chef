'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AccountSideNav from '@/components/AccountSideNav';

export const dynamic = 'force-dynamic';

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

const CUSTOM_STORE_VALUE = '__custom';

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

  portions_per_dinner: 0,
  dinners_per_week: 0,

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
  // Wrap the part that uses useSearchParams in Suspense
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-gray-500">Loading…</div>}>
      <AccountContent />
    </Suspense>
  );
}

function AccountContent() {
  const router = useRouter();
  const search = useSearchParams(); // now safely inside a Suspense boundary
  const forceEdit = search.get('edit') === '1';

  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [newEquipmentItem, setNewEquipmentItem] = useState('');
  const [newStore, setNewStore] = useState('');

  const parseCommaSeparated = (value?: string | null) =>
    value
      ? value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];

  const storesNearMeList = useMemo(
    () => parseCommaSeparated(profile?.stores_near_me),
    [profile?.stores_near_me]
  );

  const displayedEquipment = useMemo(() => {
    const base = new Set(equipmentOptions);
    const existing = profile?.equipment ?? [];
    const custom = existing.filter((item) => item && !base.has(item));
    return [...equipmentOptions, ...custom];
  }, [profile?.equipment]);

  const preferredStoreValue = profile?.preferred_store ?? '';
  const isCustomPreferredStore =
    !!preferredStoreValue && !storesNearMeList.includes(preferredStoreValue);
  const preferredStoreSelection = isCustomPreferredStore ? CUSTOM_STORE_VALUE : preferredStoreValue;

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

      // If row doesn’t exist, construct default
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

  function addEquipmentItem() {
    if (!profile) return;
    const trimmed = newEquipmentItem.trim();
    if (!trimmed) return;
    const eq = profile.equipment ?? [];
    const exists = eq.some((item) => item.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setNewEquipmentItem('');
      return;
    }
    set('equipment', [...eq, trimmed]);
    setNewEquipmentItem('');
  }

  function updateStores(list: string[]) {
    if (!profile) return;
    set('stores_near_me', list.join(', '));
  }

  function addStore() {
    if (!profile) return;
    const trimmed = newStore.trim();
    if (!trimmed) return;
    const exists = storesNearMeList.some((item) => item.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setNewStore('');
      return;
    }
    const next = [...storesNearMeList, trimmed];
    updateStores(next);
    setNewStore('');
    if (!preferredStoreValue) {
      set('preferred_store', trimmed);
    }
  }

  function removeStore(storeName: string) {
    const next = storesNearMeList.filter((item) => item !== storeName);
    updateStores(next);
    if (profile?.preferred_store === storeName) {
      set('preferred_store', '');
    }
  }

  function handlePreferredStoreChange(value: string) {
    if (value === CUSTOM_STORE_VALUE) {
      if (!isCustomPreferredStore) {
        set('preferred_store', '');
      }
      return;
    }
    set('preferred_store', value);
  }

  // 2) Save (UPSERT)
  async function saveProfile(nextAction?: 'finish') {
    if (!profile || !userId) return;
    setSaving(true);

    const payload: Partial<Profile> = {
      ...profile,
      id: userId,
      ...(profile.delivery_same_as_account ? {
        delivery_street: '',
        delivery_city: '',
        delivery_state: '',
        delivery_zipcode: '',
      } : {}),
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
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl mx-auto p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Account Profile</h1>
          <p className="text-sm text-gray-600 mt-2">
            Manage your Instant Chef details, household preferences, and shopping info in one place.
          </p>
        </div>

        <AccountSideNav className="mb-8" />
        <div className="space-y-10">
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
            {displayedEquipment.map(opt => (
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
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <input
              placeholder="Add another tool (e.g., Spiralizer)"
              className="w-full border rounded px-3 py-2"
              value={newEquipmentItem}
              onChange={e => setNewEquipmentItem(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addEquipmentItem();
                }
              }}
            />
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-900 text-white text-sm disabled:opacity-50"
              onClick={addEquipmentItem}
              disabled={!newEquipmentItem.trim()}
            >
              + Item
            </button>
          </div>
          <input
            placeholder="Notes about other equipment (e.g., Mandoline blades missing)"
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
          <label className="block text-sm font-medium mb-2">Grocery stores near you</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {storesNearMeList.map(store => (
              <span
                key={store}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
              >
                {store}
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => removeStore(store)}
                  aria-label={`Remove ${store}`}
                >
                  ×
                </button>
              </span>
            ))}
            {storesNearMeList.length === 0 && (
              <p className="text-sm text-gray-500">Add the stores you shop at most often.</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Add a grocery store"
              value={newStore}
              onChange={e => setNewStore(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addStore();
                }
              }}
            />
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-900 text-white text-sm disabled:opacity-50"
              onClick={addStore}
              disabled={!newStore.trim()}
            >
              + Item
            </button>
          </div>

          <label className="block text-sm font-medium mb-2">Where should we shop this week?</label>
          <select
            className="w-full border rounded px-3 py-2 mb-3"
            value={preferredStoreSelection}
            onChange={e => handlePreferredStoreChange(e.target.value)}
          >
            <option value="">Select a store</option>
            {storesNearMeList.map(store => (
              <option key={store} value={store}>
                {store}
              </option>
            ))}
            <option value={CUSTOM_STORE_VALUE}>Other (type manually)</option>
          </select>
          {preferredStoreSelection === CUSTOM_STORE_VALUE && (
            <input
              className="w-full border rounded px-3 py-2 mb-3"
              placeholder="Type your preferred store"
              value={preferredStoreValue}
              onChange={e => set('preferred_store', e.target.value)}
            />
          )}
          {storesNearMeList.length === 0 && preferredStoreSelection !== CUSTOM_STORE_VALUE && (
            <p className="text-xs text-gray-500 mb-3">
              Add a few stores above so you can quickly choose where we shop.
            </p>
          )}
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
