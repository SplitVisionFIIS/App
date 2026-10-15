import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ProveedorSesion, RutaProtegida, RutaPublica } from './auth';
import { Navegacion } from './componentes/Navegacion';
import { ProveedorToast } from './componentes/Toast';
import { ProveedorPreferencias } from './preferencias/PreferenciasContext';
import { Bandeja } from './paginas/Bandeja';
import { Configuracion } from './paginas/Configuracion';
import { Login } from './paginas/Login';
import { Registro } from './paginas/Registro';
import { DetalleEvento } from './paginas/eventos/DetalleEvento';
import { MisEventos } from './paginas/eventos/MisEventos';
import { NuevoEvento } from './paginas/eventos/NuevoEvento';
import { Comprobante } from './paginas/comprobantes/Comprobante';
import { Comprobantes } from './paginas/comprobantes/Comprobantes';
import { SubirComprobante } from './paginas/comprobantes/SubirComprobante';
import { Reparto } from './paginas/reparto/Reparto';
import { Pago } from './paginas/pagos/Pago';
import { MisDeudas } from './paginas/deudas/MisDeudas';
import { HistorialDeuda } from './paginas/deudas/HistorialDeuda';
import { Balance } from './paginas/balance/Balance';
import { BandejaPagos } from './paginas/bandeja-pagos/BandejaPagos';

const consulta = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ConAplicacion() {
  return (
    <RutaProtegida>
      <Navegacion>
        <Outlet />
      </Navegacion>
    </RutaProtegida>
  );
}

export function App() {
  return (
    <QueryClientProvider client={consulta}>
      <ProveedorPreferencias>
        <BrowserRouter>
          <ProveedorSesion>
            <ProveedorToast>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <RutaPublica>
                      <Login />
                    </RutaPublica>
                  }
                />
                <Route
                  path="/registro"
                  element={
                    <RutaPublica>
                      <Registro />
                    </RutaPublica>
                  }
                />
                <Route element={<ConAplicacion />}>
                  <Route path="/" element={<MisEventos />} />
                  <Route path="/eventos/nuevo" element={<NuevoEvento />} />
                  <Route path="/eventos/:id" element={<DetalleEvento />} />
                  <Route path="/eventos/:id/comprobantes" element={<Comprobantes />} />
                  <Route path="/eventos/:id/comprobantes/nuevo" element={<SubirComprobante />} />
                  <Route path="/comprobantes/:id" element={<Comprobante />} />
                  <Route path="/comprobantes/:id/reparto" element={<Reparto />} />
                  <Route path="/deudas" element={<MisDeudas />} />
                  <Route path="/deudas/:id" element={<HistorialDeuda />} />
                  <Route path="/deudas/:id/pago" element={<Pago />} />
                  <Route path="/eventos/:id/balance" element={<Balance />} />
                  <Route path="/bandeja" element={<Bandeja />} />
                  <Route path="/bandeja/pagos" element={<BandejaPagos />} />
                  <Route path="/configuracion" element={<Configuracion />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ProveedorToast>
          </ProveedorSesion>
        </BrowserRouter>
      </ProveedorPreferencias>
    </QueryClientProvider>
  );
}
