import { requireUser } from "@/lib/auth-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PerfilForm } from "./perfil-form";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-md space-y-5 py-2 sm:py-6">
      <Card>
        <CardHeader>
          <CardTitle>👤 Meu perfil</CardTitle>
          <CardDescription>
            Edite o nome que aparece nos rankings e nos gráficos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerfilForm
            user={{
              id: user.id,
              nome: user.nome,
              nome_exibicao: (user as any).nome_exibicao ?? user.nome,
              email: user.email,
              telefone: user.telefone,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
