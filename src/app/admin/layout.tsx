import { VoltarAdmin } from "./voltar-admin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <VoltarAdmin />
      {children}
    </>
  );
}
