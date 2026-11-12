import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Bar from "./Bar";
import Donut from "./Donut";
import Line from "./Line";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;
  }
});

describe("Chart components", () => {
  it("merender Line chart dengan token CSS dan ID linearGradient unik per instance", () => {
    const { container } = render(
      <>
        <Line
          labels={["Sen", "Sel", "Rab"]}
          series={[{ name: "Sistol", data: [115, 120, 118] }]}
          unit="mmHg"
        />
        <Line
          labels={["Sen", "Sel", "Rab"]}
          series={[{ name: "Diastol", data: [75, 78, 76] }]}
          unit="mmHg"
        />
      </>
    );

    const svgs = screen.getAllByRole("img", { name: /grafik garis/i });
    expect(svgs).toHaveLength(2);
    expect(container.innerHTML).not.toContain("#888");
    expect(container.innerHTML).toContain("var(--");

    const gradientIds = Array.from(
      container.querySelectorAll("linearGradient")
    ).map((el) => el.getAttribute("id"));
    expect(gradientIds.length).toBe(2);
    expect(new Set(gradientIds).size).toBe(gradientIds.length);
  });

  it("merender Bar chart vertikal dan horizontal tanpa warna fallback #888", () => {
    const { container } = render(
      <>
        <Bar labels={["A", "B"]} values={[12, 24]} unit="x" />
        <Bar labels={["A", "B"]} values={[12, 24]} unit="x" horizontal />
      </>
    );

    expect(
      screen.getByRole("img", { name: /grafik batang/i })
    ).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("#888");
    expect(screen.getAllByText("A")).toHaveLength(2);
    expect(screen.getAllByText("B")).toHaveLength(2);
  });

  it("merender Donut chart dengan center label/value dan legenda interaktif", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Donut
        segments={[
          { label: "Normal", value: 8 },
          { label: "Tinggi", value: 2 },
        ]}
        centerLabel="Total"
        centerValue="10"
      />
    );

    expect(
      screen.getByRole("img", { name: /diagram donat/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("#888");

    const normalLegendItem = screen.getByText("Normal");
    await user.hover(normalLegendItem);
    expect(container.querySelector(".donut-center strong")).toHaveTextContent(
      "80%"
    );

    await user.unhover(normalLegendItem);
    expect(container.querySelector(".donut-center strong")).toHaveTextContent(
      "10"
    );
  });
});
