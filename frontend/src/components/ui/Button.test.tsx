import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "@/components/ui/Button";

describe("Button", () => {
  it("renders button dengan label", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("fires onClick saat diklik", async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    const button = screen.getByText("Click");
    await userEvent.click(button);

    expect(handleClick).toHaveBeenCalled();
  });

  it("disabled state mencegah click", async () => {
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    );

    const button = screen.getByText("Disabled");
    await userEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("variant prop mengubah class", () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveClass("btn-danger");
  });
});
