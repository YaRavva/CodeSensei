export function KatanaLogo() {
  return (
    <div
      className="flex w-full items-center justify-center min-h-0 md:h-[260px]"
      style={{ containerType: "size" }}
    >
      {/* Логотип-катана из /CodeSensei.svg: сам SVG 1024x1024, но видимая часть
          занимает bbox x:[251,779] y:[278,734]. Маску растягиваем и позиционируем
          так, чтобы видимая часть заполняла бокс целиком, без искажений. */}
      <div
        style={{
          width: "min(100%, calc(100cqh * 1.1578))",
          aspectRatio: "528 / 456.04",
          maskImage: "url(/CodeSensei.svg)",
          maskSize: "192% 222.37%",
          maskPosition: "50.61% 48.95%",
          maskRepeat: "no-repeat",
          WebkitMaskImage: "url(/CodeSensei.svg)",
          WebkitMaskSize: "192% 222.37%",
          WebkitMaskPosition: "50.61% 48.95%",
          WebkitMaskRepeat: "no-repeat",
          backgroundColor: "var(--primary)",
        }}
      />
    </div>
  );
}
