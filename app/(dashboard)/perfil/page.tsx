'use client';
import { useEffect, useState, useCallback } from 'react';
import { getMe, getMySchedule } from '@/services/userService';
import type { ApiUser, ApiSchedule } from '@/lib/schemas';

const DAYS = [
    { key: 'MONDAY', label: 'Lunes' },
    { key: 'TUESDAY', label: 'Martes' },
    { key: 'WEDNESDAY', label: 'Miércoles' },
    { key: 'THURSDAY', label: 'Jueves' },
    { key: 'FRIDAY', label: 'Viernes' },
    { key: 'SATURDAY', label: 'Sábado' },
    { key: 'SUNDAY', label: 'Domingo' },
];

const ROLE_LABELS: Record<string, string> = { ADMIN: 'Admin', EMPLOYEE: 'Empleado', CLIENT: 'Cliente' };
const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700',
    EMPLOYEE: 'bg-blue-100 text-blue-700',
    CLIENT: 'bg-gray-100 text-gray-600',
};

export default function PerfilPage() {
    const [user, setUser] = useState<ApiUser | null>(null);
    const [schedules, setSchedules] = useState<ApiSchedule[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [u, s] = await Promise.all([getMe(), getMySchedule()]);
            setUser(u);
            setSchedules(s);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    if (loading) return <p className="text-gray-500">Cargando...</p>;
    if (!user) return <p className="text-gray-500">No se pudo cargar el perfil.</p>;

    const scheduleMap = DAYS.reduce<Record<string, ApiSchedule[]>>((acc, d) => {
        acc[d.key] = schedules.filter((s) => s.dayOfWeek === d.key);
        return acc;
    }, {});

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Mi perfil</h1>

            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 max-w-xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-700">Mis datos</h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                        <span className="block text-gray-400 text-xs mb-0.5">Nombre</span>
                        <span className="text-gray-700">{user.name} {user.lastname}</span>
                    </div>
                    <div>
                        <span className="block text-gray-400 text-xs mb-0.5">Email</span>
                        <span className="text-gray-700">{user.email}</span>
                    </div>
                    <div>
                        <span className="block text-gray-400 text-xs mb-0.5">Teléfono</span>
                        <span className="text-gray-700">{user.phone ?? '-'}</span>
                    </div>
                    <div>
                        <span className="block text-gray-400 text-xs mb-0.5">Documento</span>
                        <span className="text-gray-700">
                            {user.documentType && user.documentNumber ? `${user.documentType} ${user.documentNumber}` : '-'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-xl">
                <h2 className="font-semibold text-gray-700 mb-4">Mi horario semanal</h2>
                <div className="border border-gray-200 rounded overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left px-3 py-2 text-gray-500 font-medium">Día</th>
                                <th className="text-left px-3 py-2 text-gray-500 font-medium">Zona</th>
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map((d) => {
                                const entries = scheduleMap[d.key] ?? [];
                                if (entries.length === 0) {
                                    return (
                                        <tr key={d.key} className="border-t border-gray-100">
                                            <td className="px-3 py-2 text-gray-500 font-medium">{d.label}</td>
                                            <td className="px-3 py-2 text-gray-300 italic">Sin asignar</td>
                                        </tr>
                                    );
                                }
                                return entries.map((entry, idx) => (
                                    <tr key={entry.id} className="border-t border-gray-100">
                                        <td className="px-3 py-2 text-gray-500 font-medium">{idx === 0 ? d.label : ''}</td>
                                        <td className="px-3 py-2 text-gray-700">{entry.zone?.zoneName ?? '-'}</td>
                                    </tr>
                                ));
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
