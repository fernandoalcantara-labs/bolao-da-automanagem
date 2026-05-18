import Link from "next/link";
import { LoginForm } from "./login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mascot } from "@/components/ui/mascot";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-6 sm:py-10">
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        <Mascot size={56} />
        <h1 className="font-fredoka text-2xl font-extrabold">Bora pro Bolão! ⚽</h1>
        <p className="text-sm text-muted-foreground">Entre com email e senha</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-bold text-festive-green hover:underline">
              Cadastre-se aqui
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
