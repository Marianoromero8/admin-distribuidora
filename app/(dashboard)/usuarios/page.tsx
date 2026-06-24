'use client';
import { useEffect, useState, useCallback } from 'react';
import {
    getAllUsers,
    createEmployee,
    toggleUserStatus,
    updateUserRole,
    updateUserData,
    deleteUser,
    getUserSchedule,
    addUserSchedule,
    removeUserSchedule,
} from '@/services/userService';
import { getAllZones, createZone, deleteZone } from '@/services/zoneService';
import type { ApiUser, ApiZone, ApiSchedule } from '@/lib/schemas';
import { MoreVertical, Power, PowerOff, Trash2, X, Plus, ChevronRight } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Swal from 'sweetalert2';

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

const emptyForm = {
    name: '',
    lastname: '',
    email: '',
    password: '',
    phone: '',
    documentType: '',
    documentNumber: '',
};

export default function AdminUsuariosPage() {
    const [users, setUsers] = useState<ApiUser[]>([]);
    const [zones, setZones] = useState<ApiZone[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
    const [schedules, setSchedules] = useState<ApiSchedule[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ ...emptyForm });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [showZoneForm, setShowZoneForm] = useState(false);
    const [newZoneName, setNewZoneName] = useState('');
    const [filterRole, setFilterRole] = useState('');

    // Edit user inline
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', lastname: '', email: '', phone: '', documentType: '', documentNumber: '' });
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');

    // Schedule add form
    const [addDay, setAddDay] = useState('');
    const [addZoneId, setAddZoneId] = useState('');
    const [addingSchedule, setAddingSchedule] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [u, z] = await Promise.all([getAllUsers(), getAllZones()]);
            setUsers(u);
            setZones(z);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const openUser = async (user: ApiUser) => {
        setSelectedUser(user);
        setEditMode(false);
        setEditError('');
        setScheduleLoading(true);
        setAddDay('');
        setAddZoneId('');
        try {
            const s = await getUserSchedule(user.id);
            setSchedules(s);
        } catch (e) {
            console.error(e);
        } finally {
            setScheduleLoading(false);
        }
    };

    const handleToggleStatus = async (user: ApiUser) => {
        const action = user.isActive ? 'pausar' : 'activar';
        const result = await Swal.fire({
            title: `¿${user.isActive ? 'Pausar' : 'Activar'} usuario?`,
            text: `${user.name} ${user.lastname} será ${user.isActive ? 'pausado' : 'activado'}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4166e0',
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Sí, ${action}`,
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await toggleUserStatus(user.id, !user.isActive);
            setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
            if (selectedUser?.id === user.id) setSelectedUser((prev) => prev ? { ...prev, isActive: !prev.isActive } : null);
        } catch (e) { console.error(e); }
    };

    const startEdit = (user: ApiUser) => {
        setEditForm({
            name: user.name,
            lastname: user.lastname,
            email: user.email,
            phone: user.phone ?? '',
            documentType: user.documentType ?? '',
            documentNumber: user.documentNumber ?? '',
        });
        setEditError('');
        setEditMode(true);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setEditSaving(true);
        setEditError('');
        try {
            await updateUserData(selectedUser.id, {
                name: editForm.name,
                lastname: editForm.lastname,
                email: editForm.email,
                phone: editForm.phone || null,
                documentType: editForm.documentType || null,
                documentNumber: editForm.documentNumber || null,
            });
            const updated = { ...selectedUser, ...editForm, phone: editForm.phone || null, documentType: editForm.documentType || null, documentNumber: editForm.documentNumber || null };
            setSelectedUser(updated);
            setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? updated : u));
            setEditMode(false);
        } catch (err: unknown) {
            setEditError(err instanceof Error ? err.message : 'Error al guardar');
        } finally {
            setEditSaving(false);
        }
    };

    const handleChangeRole = async (user: ApiUser, newRole: string) => {
        if (newRole === user.role) return;
        const result = await Swal.fire({
            title: '¿Cambiar rol?',
            text: `${user.name} ${user.lastname} pasará a ser ${ROLE_LABELS[newRole] ?? newRole}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4166e0',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, cambiar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await updateUserRole(user.id, newRole);
            setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
            setSelectedUser((prev) => prev ? { ...prev, role: newRole } : null);
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (user: ApiUser) => {
        const result = await Swal.fire({
            title: '¿Eliminar usuario?',
            text: `"${user.name} ${user.lastname}" se eliminará permanentemente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await deleteUser(user.id);
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
            if (selectedUser?.id === user.id) setSelectedUser(null);
        } catch (e) { console.error(e); }
    };

    const handleCreateEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            const created = await createEmployee({
                name: form.name,
                lastname: form.lastname,
                email: form.email,
                password: form.password,
                phone: form.phone || null,
                documentType: form.documentType || null,
                documentNumber: form.documentNumber || null,
            });
            setUsers((prev) => [created, ...prev]);
            setShowForm(false);
            setForm({ ...emptyForm });
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : 'Error al crear');
        } finally {
            setSaving(false);
        }
    };

    const handleAddSchedule = async () => {
        if (!selectedUser || !addDay || !addZoneId) return;
        setAddingSchedule(true);
        try {
            const s = await addUserSchedule(selectedUser.id, { zoneId: addZoneId, dayOfWeek: addDay });
            setSchedules((prev) => [...prev, s]);
            setAddDay('');
            setAddZoneId('');
        } catch (err: unknown) {
            Swal.fire('Error', err instanceof Error ? err.message : 'No se pudo agregar', 'error');
        } finally {
            setAddingSchedule(false);
        }
    };

    const handleRemoveSchedule = async (scheduleId: string) => {
        if (!selectedUser) return;
        try {
            await removeUserSchedule(selectedUser.id, scheduleId);
            setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
        } catch (e) { console.error(e); }
    };

    const handleCreateZone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newZoneName.trim()) return;
        try {
            const z = await createZone(newZoneName.trim());
            setZones((prev) => [...prev, z]);
            setNewZoneName('');
            setShowZoneForm(false);
        } catch (err: unknown) {
            Swal.fire('Error', err instanceof Error ? err.message : 'No se pudo crear la zona', 'error');
        }
    };

    const handleDeleteZone = async (zone: ApiZone) => {
        const result = await Swal.fire({
            title: '¿Eliminar zona?',
            text: `"${zone.zoneName}" se eliminará permanentemente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await deleteZone(zone.id);
            setZones((prev) => prev.filter((z) => z.id !== zone.id));
        } catch (e) { console.error(e); }
    };

    const field = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

    const filteredUsers = filterRole ? users.filter((u) => u.role === filterRole) : users;

    // Build schedule map: dayOfWeek → entries
    const scheduleMap = DAYS.reduce<Record<string, ApiSchedule[]>>((acc, d) => {
        acc[d.key] = schedules.filter((s) => s.dayOfWeek === d.key);
        return acc;
    }, {});

    // Days already fully assigned (all zones for that day exist — just for UX)
    const usedDayZonePairs = new Set(schedules.map((s) => `${s.dayOfWeek}::${s.zoneId}`));

    return (
        <div className="flex gap-6 h-full">
            {/* Left panel */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
                    <button
                        onClick={() => { setShowForm(true); setFormError(''); setForm({ ...emptyForm }); }}
                        className="bg-[#4166e0] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#3155c9] transition-colors"
                    >
                        + Nuevo empleado
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-3 mb-4 flex-wrap">
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0] bg-white"
                    >
                        <option value="">Todos los roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="EMPLOYEE">Empleado</option>
                        <option value="CLIENT">Cliente</option>
                    </select>
                    {filterRole && (
                        <button onClick={() => setFilterRole('')} className="text-sm text-gray-500 hover:text-gray-700 underline">
                            Limpiar
                        </button>
                    )}
                </div>

                {/* New employee form */}
                {showForm && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                        <h2 className="font-semibold text-gray-700 mb-4">Nuevo empleado</h2>
                        <form onSubmit={handleCreateEmployee} className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Nombre</label>
                                <input value={form.name} onChange={(e) => field('name', e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Apellido</label>
                                <input value={form.lastname} onChange={(e) => field('lastname', e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Email</label>
                                <input type="email" value={form.email} onChange={(e) => field('email', e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Contraseña</label>
                                <input type="password" value={form.password} onChange={(e) => field('password', e.target.value)} required minLength={6} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Teléfono</label>
                                <input value={form.phone} onChange={(e) => field('phone', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Tipo de documento</label>
                                <select value={form.documentType} onChange={(e) => field('documentType', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]">
                                    <option value="">Sin especificar</option>
                                    <option value="DNI">DNI</option>
                                    <option value="CUIT">CUIT</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm text-gray-600 mb-1">Número de documento</label>
                                <input value={form.documentNumber} onChange={(e) => field('documentNumber', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]" />
                            </div>
                            {formError && <p className="col-span-2 text-red-500 text-sm">{formError}</p>}
                            <div className="col-span-2 flex gap-3">
                                <button type="submit" disabled={saving} className="bg-[#4166e0] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#3155c9] disabled:opacity-50">
                                    {saving ? 'Guardando...' : 'Crear empleado'}
                                </button>
                                <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 px-4 py-2 rounded text-sm text-gray-600 hover:bg-gray-50">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Users table */}
                {loading ? (
                    <p className="text-gray-500">Cargando...</p>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Nombre</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Rol</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Teléfono</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Estado</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u) => (
                                    <tr
                                        key={u.id}
                                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedUser?.id === u.id ? 'bg-blue-50' : ''}`}
                                        onClick={() => openUser(u)}
                                    >
                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                            {u.name} {u.lastname}
                                            <ChevronRight className="h-3 w-3 text-gray-400" />
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{u.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {ROLE_LABELS[u.role] ?? u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{u.phone ?? '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                {u.isActive ? 'Activo' : 'Pausado'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                                                        <MoreVertical className="h-4 w-4 text-gray-500" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {u.isActive ? (
                                                        <DropdownMenuItem className="cursor-pointer gap-2 text-orange-600 focus:text-orange-600" onClick={() => handleToggleStatus(u)}>
                                                            <PowerOff className="h-4 w-4" /> Pausar
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem className="cursor-pointer gap-2 text-green-600 focus:text-green-600" onClick={() => handleToggleStatus(u)}>
                                                            <Power className="h-4 w-4" /> Activar
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="cursor-pointer gap-2 text-red-500 focus:text-red-500" onClick={() => handleDelete(u)}>
                                                        <Trash2 className="h-4 w-4" /> Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && <p className="text-center py-8 text-gray-400">No hay usuarios.</p>}
                    </div>
                )}

                {/* Zones management */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-gray-700">Zonas</h2>
                        <button
                            onClick={() => setShowZoneForm((v) => !v)}
                            className="text-sm text-[#4166e0] hover:underline flex items-center gap-1"
                        >
                            <Plus className="h-4 w-4" /> Nueva zona
                        </button>
                    </div>
                    {showZoneForm && (
                        <form onSubmit={handleCreateZone} className="flex gap-2 mb-3">
                            <input
                                value={newZoneName}
                                onChange={(e) => setNewZoneName(e.target.value)}
                                placeholder="Nombre de la zona"
                                required
                                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]"
                            />
                            <button type="submit" className="bg-[#4166e0] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#3155c9]">
                                Agregar
                            </button>
                            <button type="button" onClick={() => setShowZoneForm(false)} className="border border-gray-300 px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-50">
                                Cancelar
                            </button>
                        </form>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {zones.map((z) => (
                            <div key={z.id} className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1 text-sm">
                                <span className={z.isActive ? 'text-gray-700' : 'text-gray-400 line-through'}>{z.zoneName}</span>
                                <button onClick={() => handleDeleteZone(z)} className="ml-1 text-gray-400 hover:text-red-500 transition-colors">
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                        {zones.length === 0 && <p className="text-sm text-gray-400">Sin zonas creadas.</p>}
                    </div>
                </div>
            </div>

            {/* Right panel — user detail */}
            {selectedUser && (
                <div className="w-96 shrink-0 bg-white rounded-lg border border-gray-200 p-6 self-start sticky top-6">
                    <div className="flex justify-between items-start mb-5">
                        <div>
                            <h2 className="font-bold text-gray-800 text-lg">{selectedUser.name} {selectedUser.lastname}</h2>
                            <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[selectedUser.role] ?? ''}`}>
                                {ROLE_LABELS[selectedUser.role] ?? selectedUser.role}
                            </span>
                        </div>
                        <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* User data */}
                    {editMode ? (
                        <form onSubmit={handleSaveEdit} className="space-y-3 text-sm mb-6">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                                    <input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} required className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#4166e0]" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Apellido</label>
                                    <input value={editForm.lastname} onChange={(e) => setEditForm((p) => ({ ...p, lastname: e.target.value }))} required className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#4166e0]" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Email</label>
                                <input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} required className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#4166e0]" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
                                <input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#4166e0]" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Tipo doc.</label>
                                    <select value={editForm.documentType} onChange={(e) => setEditForm((p) => ({ ...p, documentType: e.target.value }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#4166e0] bg-white">
                                        <option value="">-</option>
                                        <option value="DNI">DNI</option>
                                        <option value="CUIT">CUIT</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Número doc.</label>
                                    <input value={editForm.documentNumber} onChange={(e) => setEditForm((p) => ({ ...p, documentNumber: e.target.value }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#4166e0]" />
                                </div>
                            </div>
                            {editError && <p className="text-red-500 text-xs">{editError}</p>}
                            <div className="flex gap-2 pt-1">
                                <button type="submit" disabled={editSaving} className="bg-[#4166e0] text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-[#3155c9] disabled:opacity-50">
                                    {editSaving ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button type="button" onClick={() => setEditMode(false)} className="border border-gray-300 px-3 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-50">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-2 text-sm mb-6">
                            <div className="flex gap-2">
                                <span className="text-gray-400 w-24 shrink-0">Email</span>
                                <span className="text-gray-700 break-all">{selectedUser.email}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-gray-400 w-24 shrink-0">Teléfono</span>
                                <span className="text-gray-700">{selectedUser.phone ?? '-'}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-gray-400 w-24 shrink-0">Documento</span>
                                <span className="text-gray-700">
                                    {selectedUser.documentType ? `${selectedUser.documentType} ${selectedUser.documentNumber ?? ''}` : '-'}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-gray-400 w-24 shrink-0">Estado</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedUser.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                    {selectedUser.isActive ? 'Activo' : 'Pausado'}
                                </span>
                            </div>
                            <div className="flex gap-2 items-center">
                                <span className="text-gray-400 w-24 shrink-0">Rol</span>
                                <select
                                    value={selectedUser.role}
                                    onChange={(e) => handleChangeRole(selectedUser, e.target.value)}
                                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#4166e0] bg-white"
                                >
                                    <option value="ADMIN">Admin</option>
                                    <option value="EMPLOYEE">Empleado</option>
                                    <option value="CLIENT">Cliente</option>
                                </select>
                            </div>
                            <button
                                onClick={() => startEdit(selectedUser)}
                                className="mt-2 text-xs text-[#4166e0] hover:underline"
                            >
                                Editar datos
                            </button>
                        </div>
                    )}

                    {/* Weekly schedule */}
                    <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Horario semanal</h3>
                    {scheduleLoading ? (
                        <p className="text-sm text-gray-400">Cargando horario...</p>
                    ) : (
                        <div className="border border-gray-200 rounded overflow-hidden mb-4">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Día</th>
                                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Zona</th>
                                        <th className="px-2 py-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {DAYS.map((d) => {
                                        const entries = scheduleMap[d.key] ?? [];
                                        if (entries.length === 0) {
                                            return (
                                                <tr key={d.key} className="border-t border-gray-100">
                                                    <td className="px-3 py-2 text-gray-500 font-medium">{d.label}</td>
                                                    <td className="px-3 py-2 text-gray-300 italic">Sin zona</td>
                                                    <td />
                                                </tr>
                                            );
                                        }
                                        return entries.map((entry, idx) => (
                                            <tr key={entry.id} className="border-t border-gray-100">
                                                <td className="px-3 py-2 text-gray-500 font-medium">{idx === 0 ? d.label : ''}</td>
                                                <td className="px-3 py-2 text-gray-700">{entry.zone?.zoneName ?? '-'}</td>
                                                <td className="px-2 py-2 text-right">
                                                    <button onClick={() => handleRemoveSchedule(entry.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ));
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Add schedule entry */}
                    <div className="flex gap-2">
                        <select
                            value={addDay}
                            onChange={(e) => setAddDay(e.target.value)}
                            className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#4166e0]"
                        >
                            <option value="">Día</option>
                            {DAYS.map((d) => (
                                <option key={d.key} value={d.key}>{d.label}</option>
                            ))}
                        </select>
                        <select
                            value={addZoneId}
                            onChange={(e) => setAddZoneId(e.target.value)}
                            className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#4166e0]"
                        >
                            <option value="">Zona</option>
                            {zones.filter((z) => z.isActive && !usedDayZonePairs.has(`${addDay}::${z.id}`)).map((z) => (
                                <option key={z.id} value={z.id}>{z.zoneName}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleAddSchedule}
                            disabled={!addDay || !addZoneId || addingSchedule}
                            className="bg-[#4166e0] text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-[#3155c9] disabled:opacity-40"
                        >
                            <Plus className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
