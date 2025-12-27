import React from 'react';
import { Bell, User, Lock, Mail } from 'lucide-react';

interface SettingsProps {
    isReadOnly?: boolean;
    notifications?: {
        zoneAlerts: boolean;
        emailSummary: boolean;
    };
    onToggleNotification?: (key: 'zoneAlerts' | 'emailSummary') => void;
}

export const Settings: React.FC<SettingsProps> = ({ isReadOnly = false, notifications, onToggleNotification }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Configuración del Sistema</h2>
        <p className="text-gray-500 mt-1">Administra tus preferencias y perfil de usuario.</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {/* Profile Section */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <User className="w-5 h-5" />
            </div>
            Perfil de Usuario
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input type="text" defaultValue="Administrador Operaciones" disabled={isReadOnly} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input type="email" defaultValue="admin@ecologistics.com" disabled={isReadOnly} className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border bg-gray-50" />
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
             <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                <Bell className="w-5 h-5" />
             </div>
            Notificaciones y Alertas
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">Alertas de Zonas Incompletas</span>
                <span className="text-xs text-gray-500">Recibir notificación inmediata cuando una zona se marca incompleta.</span>
              </div>
              <button 
                disabled={isReadOnly} 
                onClick={() => onToggleNotification && onToggleNotification('zoneAlerts')}
                className={`${notifications?.zoneAlerts ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              >
                <span className={`${notifications?.zoneAlerts ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}></span>
              </button>
            </div>
            <div className="border-t border-gray-100 my-2"></div>
             <div className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">Resumen Diario por Email</span>
                <span className="text-xs text-gray-500">Enviar reporte PDF al cierre del turno.</span>
              </div>
              <button 
                disabled={isReadOnly} 
                onClick={() => onToggleNotification && onToggleNotification('emailSummary')}
                className={`${notifications?.emailSummary ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              >
                <span className={`${notifications?.emailSummary ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}></span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Section */}
         <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                <Lock className="w-5 h-5" />
            </div>
            Seguridad
          </h3>
          <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Cambiar contraseña</button>
        </div>
      </div>
    </div>
  );
};