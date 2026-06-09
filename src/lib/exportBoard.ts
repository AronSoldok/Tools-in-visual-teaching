export async function exportBoardToPng(filename = "base-ten-board.png"): Promise<void> {
  const board = document.querySelector(".board") as HTMLElement | null;
  if (!board) return;

  const { default: html2canvas } = await import("html2canvas");

  const canvas = await html2canvas(board, {
    backgroundColor: "#f0f4f8",
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
