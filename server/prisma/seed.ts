import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { aplicarRestriccionesDeIntegridad } from '../src/integridad';

const prisma = new PrismaClient();

async function main() {
  await aplicarRestriccionesDeIntegridad(prisma);

  const passwordHash = await bcrypt.hash('Password123', 10);
  const usuarios = [
    { username: 'mateo', email: 'mateo@splitvision.test' },
    { username: 'lucia', email: 'lucia@splitvision.test' },
    { username: 'andres', email: 'andres@splitvision.test' },
  ];

  const creados = [];
  for (const datos of usuarios) {
    const usuario = await prisma.usuario.upsert({
      where: { username: datos.username },
      update: {},
      create: { ...datos, passwordHash },
    });
    creados.push(usuario);
  }

  const existente = await prisma.evento.findFirst({ where: { nombre: 'Salida' } });
  const evento =
    existente ??
    (await prisma.evento.create({
      data: { nombre: 'Salida', creadorId: creados[0].id },
    }));

  for (const usuario of creados) {
    await prisma.participacion.upsert({
      where: { eventoId_usuarioId: { eventoId: evento.id, usuarioId: usuario.id } },
      update: {},
      create: { eventoId: evento.id, usuarioId: usuario.id },
    });
  }

  console.log('Seed completado:');
  console.log('  Usuarios: mateo, lucia, andres (password: Password123)');
  console.log(`  Evento demo: ${evento.nombre} (${evento.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
