export function PainelPlaceholder({ titulo, proximasFases }: { titulo: string; proximasFases: string[] }) {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-xl font-semibold text-ink">{titulo}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Este painel ainda não tem telas de módulo — a infraestrutura de navegação, sessão e persistência já está
        pronta. As telas chegam nas próximas fases:
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-neutral-600">
        {proximasFases.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
