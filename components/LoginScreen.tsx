import React, { useState } from 'react';
import { KeyRound, Mail, User, ShieldAlert, ArrowRight, BookOpen, ChevronDown, ChevronUp, CheckCircle, Database } from 'lucide-react';
import { UserProfile } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, ingresa tu usuario y contraseña.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Usuario o contraseña incorrectos.');
      }

      setSuccessMsg(`¡Bienvenido, ${data.user.nombre}!`);
      
      // Delay to show a smooth success state before transitioning
      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040d1a] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-y-auto">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-ui-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 flex flex-col space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-ui-accent/10 rounded-2xl border border-ui-accent/20 mb-2">
            <Database className="w-8 h-8 text-ui-accent animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white uppercase font-sans">
            LAB <span className="text-ui-accent">ADVICE</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Plataforma de Control de Calidad y Análisis de Materias Primas Pecuarias
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-ui-card/90 backdrop-blur-md border border-ui-border rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          {/* Top subtle highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-ui-accent/30 to-transparent" />

          <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center justify-between">
            <span>Iniciar Sesión</span>
            <span className="text-[10px] bg-ui-accent/10 text-ui-accent border border-ui-accent/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
              <CheckCircle className="w-3 h-3" /> Secure Auth
            </span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Usuario / Correo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="ej. romansiordias@gmail.com o admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-ui-darkest/80 border border-ui-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-ui-accent focus:border-ui-accent transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-ui-darkest/80 border border-ui-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-ui-accent focus:border-ui-accent transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-xs px-3 py-2.5 rounded-xl flex items-start gap-2.5 animate-shake">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Error de acceso</span>
                  {error}
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs px-3 py-2.5 rounded-xl flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-ui-accent text-[#040d1a] font-bold py-2.5 px-4 rounded-xl hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,222,255,0.25)] hover:shadow-[0_0_25px_rgba(0,222,255,0.4)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-[#040d1a]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </button>
          </form>

          {/* Collapsible Info Guide */}
          <div className="mt-6 pt-4 border-t border-ui-border/50">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-ui-accent transition-colors font-semibold"
              type="button"
            >
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> ¿Cómo conectar tu Google Sheet?
              </span>
              {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showGuide && (
              <div className="mt-3 space-y-3 text-xs text-slate-400 leading-relaxed max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                <p>
                  Puedes controlar el acceso de los usuarios agregando o modificando registros en una hoja de Google Sheets en tiempo real. Sigue estos simples pasos:
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-400">
                  <li>
                    Crea una hoja en Google Sheets con las siguientes columnas en la primera fila:
                    <div className="bg-ui-darkest text-ui-accent font-mono py-1 px-2 rounded mt-1 select-all border border-ui-border text-center text-[11px]">
                      usuario, contraseña, nombre, clientes_permitidos
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      *(Nota: La columna <code className="text-slate-200">clientes_permitidos</code> es opcional. Usa <code className="text-ui-accent">TODOS</code> para administradores o especifica el nombre del cliente ej. <code className="text-slate-200">SALVADOR ALDRETE IBARRA</code>).*
                    </span>
                  </li>
                  <li>
                    Agrega las filas con las credenciales y permisos de tus usuarios.
                  </li>
                  <li>
                    Haz clic en <span className="text-slate-300 font-semibold">Archivo &gt; Compartir &gt; Publicar en la Web</span>.
                  </li>
                  <li>
                    Selecciona tu pestaña y elige el formato <span className="text-ui-accent font-semibold">Valores separados por comas (.csv)</span>. Haz clic en "Publicar".
                  </li>
                  <li>
                    Copia la URL generada y agrégala en tus secretos de Vercel o en las variables de entorno como:
                    <div className="bg-ui-darkest text-slate-300 font-mono py-1 px-2 rounded mt-1 select-all border border-ui-border text-center">
                      GOOGLE_SHEET_CSV_URL
                    </div>
                  </li>
                </ol>
                <div className="bg-ui-accent/5 border border-ui-accent/20 p-2.5 rounded-xl text-[11px] text-slate-400">
                  <span className="font-bold text-ui-accent block mb-1">Acceso de pruebas out-of-the-box:</span>
                  Mientras configuras tu hoja, puedes ingresar con:
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-400">
                    <li><strong className="text-slate-200">Administrador global:</strong> <code className="text-slate-200">admin</code> / Clave: <code className="text-slate-200">admin123</code> (Acceso a todos)</li>
                    <li><strong className="text-slate-200">Usuario de Román:</strong> <code className="text-slate-200">romansiordias@gmail.com</code> / Clave: <code className="text-slate-200">lab123</code> (Acceso a todos)</li>
                    <li><strong className="text-slate-200">Usuario con Cliente Asignado:</strong> <code className="text-slate-200">salvador@empresa.com</code> / Clave: <code className="text-slate-200">salvador123</code> (Solo ve a Salvador Aldrete)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-600">
          Desarrollado en entorno seguro y conectado a Google Cloud Platform
        </div>
      </div>
    </div>
  );
};
