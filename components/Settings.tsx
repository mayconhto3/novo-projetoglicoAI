import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile } from '../types';
import {
    ArrowLeft, User, Activity, Bell, Syringe,
    Save, X, Edit2, Check, AlertCircle, ChevronDown, ChevronRight
} from 'lucide-react';
import { InfoTooltip, FIELD_EXPLANATIONS } from './InfoTooltip';
import { CustomSelect } from './ui/CustomSelect';

interface SettingsProps {
    onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [localUser, setLocalUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [editMode, setEditMode] = useState<string | null>(null);
    const [openSection, setOpenSection] = useState<string | null>('profile');

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                onBack();
                return;
            }

            // FIX 406: Usamos .limit(1) em vez de .maybeSingle()
            // Isso usa header application/json padrão, que aceita [] sem erro HTTP
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .limit(1);

            if (error) throw error;

            // data é um array, pegamos o primeiro elemento (se existir)
            const profileData = (data && data.length > 0) ? data[0] : {};

            const profile: UserProfile = {
                // Spread seguro do medical_data (se existir)
                ...(profileData.medical_data || {}),

                // Campos Raiz com Fallback
                name: profileData.name || '',
                email: profileData.email || authUser.email || '',
                phone: profileData.phone || '',

                // Defaults de Segurança
                weight: profileData.weight || profileData.medical_data?.weight || 0,
                height: profileData.medical_data?.height || 0,
                targetGlucosePreMeal: profileData.target_glucose_min || profileData.medical_data?.targetGlucosePreMeal || 90,
                targetGlucosePostMeal: profileData.target_glucose_max || profileData.medical_data?.targetGlucosePostMeal || 180,
                notificationSettings: profileData.notification_settings || {
                    meals: true,
                    medication: true,
                    glucose: true,
                    whatsapp: true
                },

                // Campos de Insulina (Garante defaults para evitar UI quebrada)
                insulinMethod: profileData.medical_data?.insulinMethod || 'Caneta',
                insulinStep: profileData.medical_data?.insulinStep || 1.0,
                basalInsulin: {
                    brand: '',
                    ...(profileData.medical_data?.basalInsulin || {})
                },
                bolusInsulin: {
                    brand: '',
                    ...(profileData.medical_data?.bolusInsulin || {})
                }
            };

            setUser(profile);
            setLocalUser(profile);
        } catch (err: any) {
            console.error('Error fetching profile:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!localUser) return;

        // 🔒 VALIDAÇÕES EXISTENTES
        if (localUser.weight < 20 || localUser.weight > 300) {
            setError('Peso deve estar entre 20kg e 300kg');
            return;
        }

        if (localUser.height < 50 || localUser.height > 250) {
            setError('Altura deve estar entre 50cm e 250cm');
            return;
        }

        if (localUser.targetGlucosePreMeal < 70 || localUser.targetGlucosePreMeal > 150) {
            setError('Meta glicêmica pré-refeição deve estar entre 70-150 mg/dL');
            return;
        }

        if (localUser.targetGlucosePostMeal < 100 || localUser.targetGlucosePostMeal > 300) {
            setError('Meta glicêmica pós-refeição deve estar entre 100-300 mg/dL');
            return;
        }

        if (localUser.targetGlucosePostMeal <= localUser.targetGlucosePreMeal) {
            setError('Meta pós-refeição deve ser maior que pré-refeição');
            return;
        }

        // 🔒 NOVAS VALIDAÇÕES OS-08
        if (!['Caneta', 'Seringa', 'Bomba'].includes(localUser.insulinMethod || '')) {
            setError('Método de insulina inválido');
            return;
        }

        if (![1.0, 0.5].includes(localUser.insulinStep || 1.0)) {
            setError('Precisão deve ser 1u ou 0.5u');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error('Não autenticado');

            // FIX DEFINITIVO: SCHEMA REAL DO SUPABASE
            // Colunas SQL que EXISTEM na tabela profiles
            const { error: updateError } = await supabase
                .from('profiles')
                .upsert({
                    // --- COLUNAS SQL (Nível 1) ---
                    id: authUser.id,
                    name: localUser.name,
                    phone: localUser.phone,
                    email: authUser.email,
                    target_glucose_min: localUser.targetGlucosePreMeal,
                    target_glucose_max: localUser.targetGlucosePostMeal,
                    updated_at: new Date().toISOString(),

                    // --- COFRE JSON (Nível 2 - Todo o resto) ---
                    medical_data: {
                        ...localUser,
                        weight: localUser.weight,
                        height: localUser.height,
                        notificationSettings: localUser.notificationSettings,
                        insulinMethod: localUser.insulinMethod,
                        insulinStep: localUser.insulinStep,
                        basalInsulin: localUser.basalInsulin,
                        bolusInsulin: localUser.bolusInsulin,
                        diabetesMeds: localUser.diabetesMeds || [],
                        glycemicMeds: localUser.glycemicMeds || [],
                        comorbidities: localUser.comorbidities || [],
                        communicationStyle: localUser.communicationStyle || 'Amigável',
                        mealTimes: localUser.mealTimes || { breakfast: '08:00', lunch: '12:00', dinner: '19:00' }
                    }
                });

            if (updateError) throw updateError;

            // ✅ Sincronizar estado local com servidor
            setUser(localUser);
            setSuccess(true);
            setEditMode(null);

            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error('Error saving profile:', err);
            setError(err.message || 'Erro ao salvar perfil');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setLocalUser(user);
        setEditMode(null);
        setError(null);
    };

    const updateLocalField = (field: keyof UserProfile, value: any) => {
        if (!localUser) return;
        setLocalUser({ ...localUser, [field]: value });
    };

    const updateBasalField = (field: string, value: any) => {
        if (!localUser) return;

        const updatedBasal = {
            ...localUser.basalInsulin,
            [field]: value
        };

        // Auto-ativar basalInsulin.uses se doses forem configuradas
        const hasDoses = (updatedBasal.morningDose && updatedBasal.morningDose > 0) ||
            (updatedBasal.nightDose && updatedBasal.nightDose > 0);

        setLocalUser({
            ...localUser,
            basalInsulin: {
                ...updatedBasal,
                uses: hasDoses // Auto-ativa se tiver doses
            }
        });
    };

    const updateNotificationSetting = async (key: string, value: boolean) => {
        if (!localUser) return;

        const newSettings = {
            ...localUser.notificationSettings,
            [key]: value
        };

        // Optimistic UI
        setLocalUser({
            ...localUser,
            notificationSettings: newSettings
        });

        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;

            await supabase
                .from('profiles')
                .update({ notification_settings: newSettings })
                .eq('id', authUser.id);

            setUser({ ...localUser, notificationSettings: newSettings });
        } catch (err) {
            console.error('Error updating notification:', err);
            setLocalUser(user);
        }
    };

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    // OS-21: Helper para atualizar arrays (medicamentos, comorbidades, etc)
    const toggleArrayItem = (field: string, item: string) => {
        if (!localUser) return;

        const currentArray = (localUser as any)[field] || [];
        const updated = currentArray.includes(item)
            ? currentArray.filter((i: string) => i !== item)
            : [...currentArray, item];

        setLocalUser({ ...localUser, [field]: updated });
    };

    // OS-21: Helper para atualizar horários de refeições
    const updateMealTime = (meal: 'breakfast' | 'lunch' | 'dinner', time: string) => {
        if (!localUser) return;

        setLocalUser({
            ...localUser,
            mealTimes: {
                ...localUser.mealTimes,
                [meal]: time
            }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#029491] to-[#0d4a4b] flex items-center justify-center">
                <div className="text-white text-xl">Carregando...</div>
            </div>
        );
    }

    if (!localUser) return null;

    const isDirty = JSON.stringify(user) !== JSON.stringify(localUser);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#029491] to-[#0d4a4b] pb-20">
            {/* Header */}
            <div className="bg-white/10 backdrop-blur-sm p-4 flex items-center justify-between sticky top-0 z-10">
                <button onClick={onBack} className="text-white">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-white text-xl font-bold">Configurações</h1>
                <div className="w-6" />
            </div>

            {/* Success Toast */}
            {success && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-fade-in">
                    <Check size={20} />
                    <span>Perfil atualizado com sucesso!</span>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-fade-in">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-2">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="p-4 space-y-3">
                {/* Seção: Perfil */}
                <AccordionSection
                    id="profile"
                    title="PERFIL"
                    icon={<User size={20} />}
                    isOpen={openSection === 'profile'}
                    onToggle={() => toggleSection('profile')}
                >
                    <div className="space-y-4">
                        <InputGroup
                            label="Nome"
                            value={localUser.name}
                            onChange={(v) => updateLocalField('name', v)}
                            editing={editMode === 'name'}
                            onEdit={() => setEditMode('name')}
                            onSave={handleSaveProfile}
                            onCancel={handleCancel}
                            saving={saving}
                        />

                        <InputGroup
                            label="Telefone"
                            value={localUser.phone}
                            onChange={(v) => updateLocalField('phone', v)}
                            editing={editMode === 'phone'}
                            onEdit={() => setEditMode('phone')}
                            onSave={handleSaveProfile}
                            onCancel={handleCancel}
                            saving={saving}
                            placeholder="+55 11 98765-4321"
                        />

                        <InputGroup
                            label="Email"
                            value={localUser.email}
                            onChange={(v) => updateLocalField('email', v)}
                            editing={false}
                            disabled
                            onEdit={() => { }}
                            onSave={() => { }}
                            onCancel={() => { }}
                        />
                    </div>
                </AccordionSection>

                {/* Seção: Dados Biométricos */}
                <AccordionSection
                    id="biometric"
                    title="DADOS BIOMÉTRICOS"
                    icon={<Activity size={20} />}
                    isOpen={openSection === 'biometric'}
                    onToggle={() => toggleSection('biometric')}
                >
                    <div className="space-y-4">
                        <InputGroup
                            label="Peso"
                            value={localUser.weight.toString()}
                            onChange={(v) => updateLocalField('weight', parseFloat(v) || 0)}
                            editing={editMode === 'weight'}
                            onEdit={() => setEditMode('weight')}
                            onSave={handleSaveProfile}
                            onCancel={handleCancel}
                            saving={saving}
                            type="number"
                            unit="kg"
                            placeholder="70"
                        />

                        <InputGroup
                            label="Altura"
                            value={localUser.height.toString()}
                            onChange={(v) => updateLocalField('height', parseFloat(v) || 0)}
                            editing={editMode === 'height'}
                            onEdit={() => setEditMode('height')}
                            onSave={handleSaveProfile}
                            onCancel={handleCancel}
                            saving={saving}
                            type="number"
                            unit="cm"
                            placeholder="170"
                        />
                    </div>
                </AccordionSection>

                {/* Seção: Insulina (NOVA - OS-08) */}
                <AccordionSection
                    id="insulin"
                    title="INSULINA"
                    icon={<Syringe size={20} />}
                    isOpen={openSection === 'insulin'}
                    onToggle={() => toggleSection('insulin')}
                >
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-white text-sm font-medium">Método de Aplicação</label>
                                <InfoTooltip {...FIELD_EXPLANATIONS.insulinMethod} />
                            </div>
                            <RadioGroup
                                label=""
                                options={[
                                    { value: 'Caneta', label: 'Caneta', icon: '💉' },
                                    { value: 'Seringa', label: 'Seringa', icon: '🩸' },
                                    { value: 'Bomba', label: 'Bomba', icon: '⚙️' }
                                ]}
                                value={localUser.insulinMethod || 'Caneta'}
                                onChange={(v) => updateLocalField('insulinMethod', v)}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-white text-sm font-medium">Precisão da Dose</label>
                                <InfoTooltip {...FIELD_EXPLANATIONS.insulinStep} />
                            </div>
                            <StepSelector
                                label=""
                                value={localUser.insulinStep || 1.0}
                                onChange={(v) => updateLocalField('insulinStep', v)}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-white text-sm font-medium">Marca da Basal</label>
                                <InfoTooltip {...FIELD_EXPLANATIONS.basalBrand} />
                            </div>
                            <CustomSelect
                                options={[
                                    'Lantus',
                                    'Basaglar',
                                    'Semglee',
                                    'Rezvoglar',
                                    'Basalog',
                                    'Basalog One',
                                    'Glaritus',
                                    'Glaricon',
                                    'Glarisulin',
                                    'Lansta',
                                    'Toujeo',
                                    'Tresiba',
                                    'Levemir',
                                    'Humulin N',
                                    'Novolin N',
                                    'Iletin II',
                                    'Insulatard MC',
                                    'Protaphane HM',
                                    'Outro'
                                ]}
                                value={localUser.basalInsulin?.brand || ''}
                                onChange={(v) => updateBasalField('brand', v)}
                                placeholder="Selecione a marca"
                            />
                        </div>

                        {/* Insulina Basal - Doses e Horários */}
                        <div className="space-y-3 mt-4">
                            <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">⏰ Quando você toma sua insulina basal?</div>

                            {/* Dose da Manhã */}
                            <div className="grid grid-cols-2 gap-3">
                                <InputGroup
                                    label="🌅 Quantas unidades de manhã?"
                                    value={localUser.basalInsulin?.morningDose?.toString() || ''}
                                    onChange={(v) => updateBasalField('morningDose', parseFloat(v) || 0)}
                                    editing={editMode === 'basalMorningDose'}
                                    onEdit={() => setEditMode('basalMorningDose')}
                                    onSave={handleSaveProfile}
                                    onCancel={handleCancel}
                                    saving={saving}
                                    placeholder="Ex: 10"
                                    type="number"
                                />
                                <InputGroup
                                    label="🕐 Que horas você toma?"
                                    value={localUser.basalInsulin?.morningTime || ''}
                                    onChange={(v) => updateBasalField('morningTime', v)}
                                    editing={editMode === 'basalMorningTime'}
                                    onEdit={() => setEditMode('basalMorningTime')}
                                    onSave={handleSaveProfile}
                                    onCancel={handleCancel}
                                    saving={saving}
                                    placeholder="Ex: 08:00"
                                    type="time"
                                />
                            </div>

                            {/* Dose da Noite */}
                            <div className="grid grid-cols-2 gap-3">
                                <InputGroup
                                    label="🌙 Quantas unidades à noite?"
                                    value={localUser.basalInsulin?.nightDose?.toString() || ''}
                                    onChange={(v) => updateBasalField('nightDose', parseFloat(v) || 0)}
                                    editing={editMode === 'basalNightDose'}
                                    onEdit={() => setEditMode('basalNightDose')}
                                    onSave={handleSaveProfile}
                                    onCancel={handleCancel}
                                    saving={saving}
                                    placeholder="Ex: 12"
                                    type="number"
                                />
                                <InputGroup
                                    label="🕐 Que horas você toma?"
                                    value={localUser.basalInsulin?.nightTime || ''}
                                    onChange={(v) => updateBasalField('nightTime', v)}
                                    editing={editMode === 'basalNightTime'}
                                    onEdit={() => setEditMode('basalNightTime')}
                                    onSave={handleSaveProfile}
                                    onCancel={handleCancel}
                                    saving={saving}
                                    placeholder="Ex: 22:00"
                                    type="time"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-white text-sm font-medium">Marca da Rápida (Bolus)</label>
                                <InfoTooltip
                                    title="Marca da Insulina Rápida (Bolus)"
                                    content="Nome da sua insulina de ação rápida (bolus), usada nas refeições.\n\n💉 Exemplos comuns:\n• Humalog (lispro)\n• NovoRapid (aspart)\n• Fiasp (aspart ultra-rápida)\n• Apidra (glulisina)\n\n📝 Ajuda a IA a entender seu tratamento completo e fazer sugestões mais personalizadas."
                                />
                            </div>
                            <CustomSelect
                                options={[
                                    'Humalog',
                                    'NovoRapid',
                                    'Fiasp',
                                    'Apidra',
                                    'Lyumjev',
                                    'Admelog',
                                    'Insulin Lispro',
                                    'Insulin Aspart',
                                    'Insulin Glulisine',
                                    'Humulin R',
                                    'Novolin R',
                                    'Actrapid',
                                    'Regular Iletin II',
                                    'Outro'
                                ]}
                                value={localUser.bolusInsulin?.brand || ''}
                                onChange={(v) => {
                                    if (!localUser) return;
                                    setLocalUser({
                                        ...localUser,
                                        bolusInsulin: { ...localUser.bolusInsulin, brand: v }
                                    });
                                }}
                                placeholder="Selecione a marca"
                            />
                        </div>

                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-xs text-[#b3ffd2] mb-2">💡 Dica</p>
                            <p className="text-xs text-white/80">
                                A precisão da dose afeta como a IA calcula suas sugestões.
                                Se você usa caneta de <strong>1u</strong>, a IA arredondará para inteiros.
                                Se usa <strong>0.5u</strong>, permite decimais.
                            </p>
                        </div>
                    </div>
                </AccordionSection>

                {/* Seção: Metas Terapêuticas */}
                <AccordionSection
                    id="targets"
                    title="METAS TERAPÊUTICAS"
                    icon={<Activity size={20} />}
                    isOpen={openSection === 'targets'}
                    onToggle={() => toggleSection('targets')}
                >
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center">
                                <InputGroup
                                    label="Meta Glicêmica Pré-Refeição"
                                    value={localUser.targetGlucosePreMeal.toString()}
                                    onChange={(v) => updateLocalField('targetGlucosePreMeal', parseInt(v) || 90)}
                                    editing={editMode === 'targetPre'}
                                    onEdit={() => setEditMode('targetPre')}
                                    onSave={handleSaveProfile}
                                    onCancel={handleCancel}
                                    saving={saving}
                                    type="number"
                                    unit="mg/dL"
                                    placeholder="90"
                                />
                                <InfoTooltip {...FIELD_EXPLANATIONS.targetPreMeal} />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center">
                                <InputGroup
                                    label="Meta Glicêmica Pós-Refeição"
                                    value={localUser.targetGlucosePostMeal.toString()}
                                    onChange={(v) => updateLocalField('targetGlucosePostMeal', parseInt(v) || 180)}
                                    editing={editMode === 'targetPost'}
                                    onEdit={() => setEditMode('targetPost')}
                                    onSave={handleSaveProfile}
                                    onCancel={handleCancel}
                                    saving={saving}
                                    type="number"
                                    unit="mg/dL"
                                    placeholder="180"
                                />
                                <InfoTooltip {...FIELD_EXPLANATIONS.targetPostMeal} />
                            </div>
                        </div>
                    </div>
                </AccordionSection>

                {/* Seção: Rotina Alimentar (OS-21) */}
                <AccordionSection
                    id="meals"
                    title="ROTINA ALIMENTAR"
                    icon={<Activity size={20} />}
                    isOpen={openSection === 'meals'}
                    onToggle={() => toggleSection('meals')}
                >
                    <div className="space-y-4">
                        <div className="bg-white/5 rounded-xl p-3 mb-4">
                            <p className="text-xs text-[#b3ffd2] mb-2">💡 Importante</p>
                            <p className="text-xs text-white/80">
                                Esses horários ajudam a IA a identificar automaticamente se é café, almoço ou jantar quando você envia uma foto de comida.
                            </p>
                        </div>

                        <InputGroup
                            label="Horário do Café da Manhã"
                            value={localUser.mealTimes?.breakfast || '08:00'}
                            onChange={(v) => updateMealTime('breakfast', v)}
                            editing={editMode === 'breakfastTime'}
                            onEdit={() => setEditMode('breakfastTime')}
                            onSave={handleSaveProfile}
                            onCancel={handleCancel}
                            saving={saving}
                            type="time"
                            placeholder="08:00"
                        />

                        <InputGroup
                            label="Horário do Almoço"
                            value={localUser.mealTimes?.lunch || '12:00'}
                            onChange={(v) => updateMealTime('lunch', v)}
                            editing={editMode === 'lunchTime'}
                            onEdit={() => setEditMode('lunchTime')}
                            onSave={handleSaveProfile}
                            onCancel={handleCancel}
                            saving={saving}
                            type="time"
                            placeholder="12:00"
                        />

                        <InputGroup
                            label="Horário do Jantar"
                            value={localUser.mealTimes?.dinner || '19:00'}
                            onChange={(v) => updateMealTime('dinner', v)}
                            editing={editMode === 'dinnerTime'}
                            onEdit={() => setEditMode('dinnerTime')}
                            onSave={handleSaveProfile}
                            onCancel={handleCancel}
                            saving={saving}
                            type="time"
                            placeholder="19:00"
                        />
                    </div>
                </AccordionSection>

                {/* Seção: Notificações */}
                <AccordionSection
                    id="notifications"
                    title="NOTIFICAÇÕES"
                    icon={<Bell size={20} />}
                    isOpen={openSection === 'notifications'}
                    onToggle={() => toggleSection('notifications')}
                >
                    <div className="space-y-3">
                        <ToggleItem
                            label="Lembretes de Refeições"
                            checked={localUser.notificationSettings?.meals ?? true}
                            onChange={(v) => updateNotificationSetting('meals', v)}
                        />
                        <ToggleItem
                            label="Lembretes de Medicação"
                            checked={localUser.notificationSettings?.medication ?? true}
                            onChange={(v) => updateNotificationSetting('medication', v)}
                        />
                        <ToggleItem
                            label="Alertas de Glicemia"
                            checked={localUser.notificationSettings?.glucose ?? true}
                            onChange={(v) => updateNotificationSetting('glucose', v)}
                        />
                        <ToggleItem
                            label="Notificações WhatsApp"
                            checked={localUser.notificationSettings?.whatsapp ?? true}
                            onChange={(v) => updateNotificationSetting('whatsapp', v)}
                        />
                    </div>
                </AccordionSection>

                {/* Seção: Saúde & Medicamentos (OS-21) */}
                <AccordionSection
                    id="health"
                    title="SAÚDE & MEDICAMENTOS"
                    icon={<Activity size={20} />}
                    isOpen={openSection === 'health'}
                    onToggle={() => toggleSection('health')}
                >
                    <div className="space-y-4">
                        <div className="bg-white/5 rounded-xl p-3 mb-4">
                            <p className="text-xs text-[#b3ffd2] mb-2">💡 Contexto Clínico</p>
                            <p className="text-xs text-white/80">
                                Essas informações enriquecem o contexto da IA para recomendações mais seguras e personalizadas.
                            </p>
                        </div>

                        {/* Medicamentos para Diabetes */}
                        <div>
                            <label className="block text-white text-sm font-medium mb-2">
                                Medicamentos para Diabetes (Não Insulina)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['Metformina', 'Jardiance', 'Ozempic', 'Gliclazida', 'Victoza'].map(med => (
                                    <PillTag
                                        key={med}
                                        label={med}
                                        isSelected={localUser.diabetesMeds?.includes(med) || false}
                                        onClick={() => toggleArrayItem('diabetesMeds', med)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Medicamentos que Afetam Glicemia */}
                        <div>
                            <label className="block text-white text-sm font-medium mb-2">
                                Medicamentos que Afetam Glicemia
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['Corticoides', 'Betabloqueadores', 'Diuréticos', 'Antipsicóticos'].map(med => (
                                    <PillTag
                                        key={med}
                                        label={med}
                                        isSelected={localUser.glycemicMeds?.includes(med) || false}
                                        onClick={() => toggleArrayItem('glycemicMeds', med)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Comorbidades */}
                        <div>
                            <label className="block text-white text-sm font-medium mb-2">
                                Comorbidades
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['Hipertensão', 'Colesterol', 'Neuropatia', 'Retinopatia', 'Doença Renal'].map(comorb => (
                                    <PillTag
                                        key={comorb}
                                        label={comorb}
                                        isSelected={localUser.comorbidities?.includes(comorb) || false}
                                        onClick={() => toggleArrayItem('comorbidities', comorb)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </AccordionSection>

                {/* Seção: Preferências de Comunicação (OS-20 + OS-21) */}
                <AccordionSection
                    id="communication"
                    title="PREFERÊNCIAS DE COMUNICAÇÃO"
                    icon={<Activity size={20} />}
                    isOpen={openSection === 'communication'}
                    onToggle={() => toggleSection('communication')}
                >
                    <div className="space-y-4">
                        <div className="bg-white/5 rounded-xl p-3 mb-4">
                            <p className="text-xs text-[#b3ffd2] mb-2">🎭 Personalidade da IA</p>
                            <p className="text-xs text-white/80">
                                Escolha como você prefere que a IA se comunique com você. Isso não afeta os cálculos, apenas o tom das mensagens.
                            </p>
                        </div>

                        <div>
                            <label className="block text-white text-sm font-medium mb-2">
                                Estilo de Comunicação
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <PillTag
                                    label="😊 Amigável (Carinhoso e Motivador)"
                                    isSelected={localUser.communicationStyle === 'Amigável'}
                                    onClick={() => setLocalUser({ ...localUser, communicationStyle: 'Amigável' })}
                                />
                                <PillTag
                                    label="🤖 Direto (Objetivo e Técnico)"
                                    isSelected={localUser.communicationStyle === 'Direto'}
                                    onClick={() => setLocalUser({ ...localUser, communicationStyle: 'Direto' })}
                                />
                                <PillTag
                                    label="⚔️ Educativo (Firme e Disciplinador)"
                                    isSelected={localUser.communicationStyle === 'Educativo'}
                                    onClick={() => setLocalUser({ ...localUser, communicationStyle: 'Educativo' })}
                                />
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-xs text-white/80">
                                <strong>Amigável:</strong> "Oi querido! 😊 Sua glicemia está em 120! Você arrasou! 🎉"<br />
                                <strong>Direto:</strong> "Glicemia: 120 mg/dL. Alvo atingido."<br />
                                <strong>Educativo:</strong> "120 mg/dL. Bom trabalho. Mantenha o foco."
                            </p>
                        </div>
                    </div>
                </AccordionSection>

                {/* Botão Salvar Fixo (se houver mudanças) */}
                {isDirty && (
                    <div className="fixed bottom-20 left-0 right-0 p-4 bg-white/10 backdrop-blur-sm">
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="flex-1 bg-gray-500 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="flex-1 bg-[#56da98] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        Salvar Alterações
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// COMPONENTES ATÔMICOS
// ============================================================================

interface AccordionSectionProps {
    id: string;
    title: string;
    icon: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
    id,
    title,
    icon,
    isOpen,
    onToggle,
    children
}) => (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden transition-all">
        <div
            onClick={onToggle}
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        >
            <div className="flex items-center gap-2 text-[#b3ffd2]">
                {icon}
                <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
            </div>
            {isOpen ? (
                <ChevronDown size={20} className="text-white transition-transform" />
            ) : (
                <ChevronRight size={20} className="text-white transition-transform" />
            )}
        </div>

        {isOpen && (
            <div className="p-4 pt-0 space-y-4 animate-fade-in">
                {children}
            </div>
        )}
    </div>
);

interface SectionCardProps {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ icon, title, children }) => (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4 text-[#b3ffd2]">
            {icon}
            <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
        </div>
        {children}
    </div>
);

interface InputGroupProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    editing: boolean;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    saving?: boolean;
    type?: 'text' | 'number' | 'email' | 'tel';
    unit?: string;
    placeholder?: string;
    disabled?: boolean;
}

const InputGroup: React.FC<InputGroupProps> = ({
    label,
    value,
    onChange,
    editing,
    onEdit,
    onSave,
    onCancel,
    saving = false,
    type = 'text',
    unit,
    placeholder,
    disabled = false
}) => (
    <div className="flex items-center justify-between">
        <div className="flex-1">
            <p className="text-xs text-[#b3ffd2] mb-1">{label}</p>
            {editing ? (
                <div className="flex items-center gap-2">
                    <input
                        type={type}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="bg-white/20 text-white px-3 py-2 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-[#56da98]"
                        placeholder={placeholder}
                        disabled={saving}
                    />
                    {unit && <span className="text-white text-sm">{unit}</span>}
                </div>
            ) : (
                <p className="text-white font-medium">
                    {value} {unit}
                </p>
            )}
        </div>
        {!disabled && (
            <button
                onClick={editing ? onCancel : onEdit}
                className="text-[#56da98] ml-4"
                disabled={saving}
            >
                {editing ? <X size={20} /> : <Edit2 size={20} />}
            </button>
        )}
    </div>
);

interface RadioOption {
    value: string;
    label: string;
    icon?: string;
}

interface RadioGroupProps {
    label: string;
    options: RadioOption[];
    value: string;
    onChange: (value: string) => void;
}

const RadioGroup: React.FC<RadioGroupProps> = ({ label, options, value, onChange }) => (
    <div>
        <p className="text-xs text-[#b3ffd2] mb-2">{label}</p>
        <div className="grid grid-cols-3 gap-2">
            {options.map(option => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`p-3 rounded-xl font-medium transition-all ${value === option.value
                        ? 'bg-[#56da98] text-white shadow-lg scale-105'
                        : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                >
                    {option.icon && <div className="text-2xl mb-1">{option.icon}</div>}
                    <div className="text-sm">{option.label}</div>
                </button>
            ))}
        </div>
    </div>
);

interface StepSelectorProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
}

const StepSelector: React.FC<StepSelectorProps> = ({ label, value, onChange }) => (
    <div>
        <p className="text-xs text-[#b3ffd2] mb-2">{label}</p>
        <div className="grid grid-cols-2 gap-2">
            <button
                onClick={() => onChange(1.0)}
                className={`p-3 rounded-xl font-medium transition-all ${value === 1.0
                    ? 'bg-[#56da98] text-white shadow-lg scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
            >
                <div className="text-lg font-bold">1u</div>
                <div className="text-xs opacity-80">Padrão</div>
            </button>
            <button
                onClick={() => onChange(0.5)}
                className={`p-3 rounded-xl font-medium transition-all ${value === 0.5
                    ? 'bg-[#56da98] text-white shadow-lg scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
            >
                <div className="text-lg font-bold">0.5u</div>
                <div className="text-xs opacity-80">Precisão</div>
            </button>
        </div>
    </div>
);

interface ToggleItemProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const ToggleItem: React.FC<ToggleItemProps> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between">
        <span className="text-white">{label}</span>
        <button
            onClick={() => onChange(!checked)}
            className={`w-12 h-6 rounded-full transition-colors relative ${checked ? 'bg-[#56da98]' : 'bg-gray-400'
                }`}
        >
            <div
                className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${checked ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    </div>
);

// OS-21: Componente PillTag para seleção múltipla
interface PillTagProps {
    label: string;
    isSelected: boolean;
    onClick: () => void;
}

const PillTag: React.FC<PillTagProps> = ({ label, isSelected, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isSelected
            ? 'bg-[#56da98] text-white shadow-lg scale-105'
            : 'bg-white/10 text-white hover:bg-white/20'
            }`}
    >
        {label}
    </button>
);
