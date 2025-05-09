// ...
const materialProjectUpdateSchema = z.object({
  title: z.string().min(1, "El título es requerido").optional(),
  referenceCode: z.string().min(1, "Reference code is required").optional(),
  brand: z.string().min(1, "Brand is required").optional(),
  supplier: z.string().min(1, "Supplier is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  unitOfMeasure: z.enum(unitsOfMeasure, {
    errorMap: () => ({ message: "La unidad de medida es inválida." }),
  }).optional(),
  estimatedUnitPrice: z.number().min(0, "Estimated unit price must be non-negative").optional(),
  profitMargin: z.number().min(0).optional().nullable(),
}).strict();
// ...
export async function PUT(request: Request, { params }: { params: Params }) {
  // ...
  const body = await request.json();
  
  // ... (profitMargin handling logic) ...

  const parsedBody = materialProjectUpdateSchema.parse(body); // This line parses the request body. If 'title' is in 'body' and valid, it will be in 'parsedBody'.

  const updatedMaterialProject = await MaterialProject.findByIdAndUpdate(
    materialProjectId,
    { $set: parsedBody }, // 'parsedBody' is used here. If it contains 'title', MongoDB will attempt to update it.
    { new: true, runValidators: true }
  );
  // ...
}
    