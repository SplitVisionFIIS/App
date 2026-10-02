import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Boton, Campo, MensajeError } from '../components/ui';

export function Login() {
  const { iniciarSesion } = useAuth();
  const navegar = useNavigate();
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(identificador, password);
      navegar('/eventos');
    } catch (err) {
      setError(err instanceof globalThis.Error ? err.message : 'No se pudo iniciar sesion');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Iniciar sesion</h1>
      <form onSubmit={enviar} className="space-y-4">
        <Campo
          etiqueta="Username o correo"
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
          required
        />
        <Campo
          etiqueta="Contrasena"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <MensajeError mensaje={error} />
        <Boton type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Entrando...' : 'Entrar'}
        </Boton>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="text-indigo-600 hover:underline">
          Registrate
        </Link>
      </p>
    </div>
  );
}
