const serif = { fontFamily: '"Instrument Serif", serif' } as const;

export function AuthCardEpigraph() {
  return (
    <div className="mb-6 text-center">
      <p
        className="text-balance text-lg font-normal leading-snug text-foreground/90"
        style={serif}
      >
         Think clearly. Write slowly.
      </p>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
        A quiet corner for your thoughts.&nbsp;Away from feeds, noise, and
        instant answers.
      </p>
    </div>
  );
}
