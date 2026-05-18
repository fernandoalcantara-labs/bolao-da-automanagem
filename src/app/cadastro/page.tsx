import Link from "next/link";
import { CadastroForm } from "./cadastro-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mascot } from "@/components/ui/mascot";

export default function CadastroPage() {
  return (
    <div className="mx-auto max-w-md py-6 sm:py-10">
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        <Mascot size={56} />
        <h1 className="font-fredoka text-2xl font-extrabold">Tô dentro! 🎉</h1>
        <p className="text-sm text-muted-foreground">Vagas limitadas a 30 participantes</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cadastro</CardTitle>
          <CardDescription>
            Já tem conta?{" "}
            <Link href="/login" className="font-bold text-festive-green hover:underline">
              Entre aqui
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
