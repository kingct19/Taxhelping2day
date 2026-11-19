"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";

export function SignaturePad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const [value, setValue] = useState("");

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    const { x, y } = point(event);
    context.strokeStyle = "#111111";
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(x, y);
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) {
      return;
    }
    const context = canvasRef.current?.getContext("2d");
    if (!context) {
      return;
    }
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.stroke();
    hasInk.current = true;
    commit();
  }

  function commit() {
    const canvas = canvasRef.current;
    if (canvas && hasInk.current) {
      setValue(canvas.toDataURL("image/png"));
    }
  }

  function end() {
    drawing.current = false;
    commit();
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
    setValue("");
  }

  return (
    <Field>
      <FieldLabel>Signature</FieldLabel>
      <canvas
        ref={canvasRef}
        width={640}
        height={180}
        className="h-36 w-full touch-none rounded-lg border bg-card"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <input type="hidden" name="signature" value={value} />
      <FieldDescription>Draw your signature with a mouse or finger. It is stamped on the PDF.</FieldDescription>
      <Button type="button" variant="outline" onClick={clear}>
        Clear
      </Button>
    </Field>
  );
}
