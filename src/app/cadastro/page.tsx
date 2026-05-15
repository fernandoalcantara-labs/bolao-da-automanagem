import Link from "next/link";
import { CadastroForm } from "./cadastro-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CadastroPage() {
  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Cadastro no Bolão</CardTitle>
          <CardDescription>
            Vagas limitadas: 30 participantes. Já tem conta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Entre
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CadastroForm />
        </CardContent>
      </Card>
    </div>
  );
}
