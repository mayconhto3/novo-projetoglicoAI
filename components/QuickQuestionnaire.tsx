import React, { useState } from 'react';
import { UserProfile, DiabetesType } from '../types';
import { Sparkles, ArrowRight, SkipForward, Zap } from 'lucide-react';

interface QuickQuestionnaireProps {
    onComplete: (profile: Partial<UserProfile>) => void;
    onSkip: () => void;
}

export const QuickQuestionnaire: React.FC<QuickQuestionnaireProps> = ({ onComplete, onSkip }) => {
    const [formData, setFormData] = useState({
        name: '',
        diabetesType: DiabetesType.Unknown,
        usesInsulin: false,
        phone: ''
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Nome é obrigatório';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Telefone é obrigatório';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        onComplete(formData);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in fade-in slide-in-from-bottom duration-500">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Sparkles className="text-white" size={36} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Bem-vindo! 👋</h1>
                    <p className="text-slate-500 text-sm">Vamos começar com o básico</p>
                    <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-bold">
                        <Zap size={14} fill="currentColor" />
                        Ganhe +50 XP ao completar
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-5">
                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Como você se chama? *
                        </label>
                        <input
                            type="text"
                            placeholder="Seu nome completo"
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition ${errors.name
                                    ? 'border-red-300 focus:border-red-500'
                                    : 'border-slate-200 focus:border-teal-500'
                                }`}
                            value={formData.name}
                            onChange={(e) => {
                                setFormData({ ...formData, name: e.target.value });
                                if (errors.name) setErrors({ ...errors, name: '' });
                            }}
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    {/* Tipo de Diabetes */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Tipo de Diabetes *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.values(DiabetesType).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFormData({ ...formData, diabetesType: type })}
                                    className={`p-3 rounded-xl border-2 text-sm font-medium transition ${formData.diabetesType === type
                                            ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Usa Insulina */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Você usa insulina? *
                        </label>
                        <div className="flex gap-3">
                            {[
                                { label: 'Sim', value: true, emoji: '💉' },
                                { label: 'Não', value: false, emoji: '❌' }
                            ].map(option => (
                                <button
                                    key={option.label}
                                    onClick={() => setFormData({ ...formData, usesInsulin: option.value })}
                                    className={`flex-1 p-3 rounded-xl border-2 font-medium transition flex items-center justify-center gap-2 ${formData.usesInsulin === option.value
                                            ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <span>{option.emoji}</span>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* WhatsApp */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            WhatsApp (com DDD) *
                        </label>
                        <input
                            type="tel"
                            placeholder="31 99999-9999"
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition ${errors.phone
                                    ? 'border-red-300 focus:border-red-500'
                                    : 'border-slate-200 focus:border-teal-500'
                                }`}
                            value={formData.phone}
                            onChange={(e) => {
                                setFormData({ ...formData, phone: e.target.value });
                                if (errors.phone) setErrors({ ...errors, phone: '' });
                            }}
                        />
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        <p className="text-xs text-slate-400 mt-1">
                            📱 Usaremos para enviar lembretes e suporte
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 space-y-3">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:from-teal-700 hover:to-blue-700 transition shadow-lg shadow-teal-200 flex items-center justify-center gap-2 group"
                    >
                        Começar Agora
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                        onClick={onSkip}
                        className="w-full bg-white text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50 transition border-2 border-slate-200 flex items-center justify-center gap-2"
                    >
                        <SkipForward size={18} />
                        Pular por enquanto
                    </button>
                </div>

                <p className="text-xs text-center text-slate-400 mt-6">
                    ✨ Você poderá completar seu perfil depois e ganhar mais recompensas!
                </p>
            </div>
        </div>
    );
};
