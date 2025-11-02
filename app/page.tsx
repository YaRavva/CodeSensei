export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold mb-4">CodeSensei</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Python тренажер для школьников 7-9 классов
        </p>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Интерактивный Python-тренажер с геймификацией, персонализацией и модульной системой
          обучения
        </p>
      </div>
    </div>
  );
}
