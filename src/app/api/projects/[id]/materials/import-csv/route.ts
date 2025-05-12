'use server';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MaterialProject from '@/models/MaterialProject';
import Project from '@/models/Project';
import mongoose from 'mongoose';
import { z } from 'zod';
import type { MaterialProject as MaterialProjectType } from '@/types';

interface Params {
  id: string; // Project ID
}

const unitsOfMeasureValues = [
  'm', 'm²', 'm³', 'kg', 'L', 'gal', 'unidad', 'caja', 'rollo', 'bolsa', 'hr', 'día', 'semana', 'mes', 'global', 'pulg', 'pie', 'yd', 'ton', 'lb'
] as const;

// Schema for a single row in the CSV
const csvMaterialRowSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  referenceCode: z.string().optional().nullable(), 
  brand: z.string().optional().nullable(), 
  supplier: z.string().optional().nullable(), 
  description: z.string().optional().nullable(), 
  unitOfMeasure: z.enum(unitsOfMeasureValues, {
    errorMap: () => ({ message: "La unidad de medida es inválida." }),
  }),
  estimatedUnitPrice: z.preprocess(
    (val) => (String(val).trim() === '' ? 0 : Number(String(val).replace(/,/g, '.'))), 
    z.number().min(0, "El precio unitario estimado debe ser no negativo")
  ),
  profitMargin: z.preprocess(
    (val) => (String(val).trim() === '' ? null : Number(String(val).replace(/,/g, '.'))), 
    z.number().min(0, "El margen de utilidad debe ser no negativo").nullable().optional()
  ),
});


// Basic CSV parser
function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split(/\r\n|\n|\r/);
  if (lines.length < 2) return []; // Must have header and at least one data row

  const headers = lines[0].split(',').map(header => header.trim());
  const dataRows = lines.slice(1);

  return dataRows.map(line => {
    const values = line.split(',');
    const rowObject: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObject[header] = values[index]?.trim() ?? '';
    });
    return rowObject;
  });
}


export async function POST(request: Request, { params }: { params: Params }) {
  const { id: projectId } = params;
  console.log(`POST /api/projects/${projectId}/materials/import-csv called`);

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    return new NextResponse(JSON.stringify({ message: 'Invalid Project ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();
    console.log(`Database connected for CSV import to project ${projectId}.`);

    const projectExists = await Project.findById(projectId);
    if (!projectExists) {
      return new NextResponse(JSON.stringify({ message: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new NextResponse(JSON.stringify({ message: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (file.type !== 'text/csv') {
      return new NextResponse(JSON.stringify({ message: 'Invalid file type. Only CSV files are allowed.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const csvText = await file.text();
    const parsedRows = parseCsv(csvText);

    if (parsedRows.length === 0) {
      return new NextResponse(JSON.stringify({ message: 'CSV file is empty or has no data rows.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const createdMaterials: MaterialProjectType[] = [];
    const errors: { row: number; message: string; details?: any }[] = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      try {
        const requiredHeaders = ['title', 'unitOfMeasure', 'estimatedUnitPrice']; 
        for(const header of requiredHeaders) {
            if(!(header in row)) {
                throw new Error(`Falta la columna requerida: ${header}`);
            }
        }

        const validatedRow = csvMaterialRowSchema.parse(row);
        
        const newMaterialProjectData: any = { // Using 'any' for dynamic property assignment
          projectId: new mongoose.Types.ObjectId(projectId),
          title: validatedRow.title,
          unitOfMeasure: validatedRow.unitOfMeasure,
          estimatedUnitPrice: validatedRow.estimatedUnitPrice,
        };

        // Only add optional fields if they have a non-empty, non-null value.
        // Otherwise, Mongoose's `default: null` (or omission if not explicitly defaulted) should apply.
        if (validatedRow.referenceCode && validatedRow.referenceCode.trim() !== "") {
            newMaterialProjectData.referenceCode = validatedRow.referenceCode;
        }
        if (validatedRow.brand && validatedRow.brand.trim() !== "") {
            newMaterialProjectData.brand = validatedRow.brand;
        }
        if (validatedRow.supplier && validatedRow.supplier.trim() !== "") {
            newMaterialProjectData.supplier = validatedRow.supplier;
        }
        if (validatedRow.description && validatedRow.description.trim() !== "") {
            newMaterialProjectData.description = validatedRow.description;
        }
        // For profitMargin, which can be a number or null (and Zod handles its preprocessing)
        // If it's undefined (e.g., column missing & Zod optional), it won't be added, Mongoose default should apply.
        // If it's null (e.g., empty cell parsed to null by Zod), it will be set to null.
        if (validatedRow.profitMargin !== undefined) {
            newMaterialProjectData.profitMargin = validatedRow.profitMargin;
        }
        
        const newMaterialProject = new MaterialProject(newMaterialProjectData);
        await newMaterialProject.save();
        createdMaterials.push(newMaterialProject.toObject() as MaterialProjectType);

      } catch (error: any) {
        if (error instanceof z.ZodError) {
          errors.push({ row: i + 2, message: 'Error de validación de datos.', details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') });
        } else if (error instanceof mongoose.Error.ValidationError) {
          errors.push({ row: i + 2, message: `Error de validación de base de datos: ${error.message}` });
        }
         else {
          errors.push({ row: i + 2, message: `Error procesando fila: ${error.message}` });
        }
      }
    }

    const summary = {
      totalRows: parsedRows.length,
      successfulImports: createdMaterials.length,
      failedImports: errors.length,
      errors: errors,
    };

    console.log("CSV Import Summary:", summary);

    return NextResponse.json(
      { 
        message: `Importación completada. ${summary.successfulImports} materiales importados, ${summary.failedImports} errores.`,
        summary,
        createdMaterials 
      }, 
      { status: errors.length > 0 && createdMaterials.length === 0 ? 400 : (errors.length > 0 ? 207 : 201) } // 207 Multi-Status if partial success
    );

  } catch (error: any) {
    console.error(`Error importing materials from CSV for project ${projectId}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to import materials from CSV.',
      error: error.message || String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
    