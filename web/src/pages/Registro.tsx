import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Boton, Campo, MensajeError } from '../components/ui';

export function Registro() {
  const { registrarse } = useAuth();
  const navegar = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await registrarse(username, email, password);
      navegar('/eventos');
    } catch (err) {
      setError(err instanceof globalThis.Error ? err.message : 'No se pudo registrar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Crear cuenta</h1>
      <form onSubmit={enviar} className="space-y-4">
        <Campo
          etiqueta="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <Campo
          etiqueta="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Campo
          etiqueta="Contrasena (minimo 8 caracteres)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <MensajeError mensaje={error} />
        <Boton type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Creando...' : 'Crear cuenta'}
        </Boton>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-indigo-600 hover:underline">
          Inicia sesion
        </Link>
      </p>
    </div>
  );
}
