
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
  referenceCode: z.string().optional().nullable(), // Optional
  brand: z.string().optional().nullable(), // Optional
  supplier: z.string().optional().nullable(), // Optional
  description: z.string().optional().nullable(), // Optional
  unitOfMeasure: z.enum(unitsOfMeasureValues, {
    errorMap: () => ({ message: "La unidad de medida es inválida." }),
  }),
  estimatedUnitPrice: z.preprocess(
    (val) => (String(val).trim() === '' ? 0 : Number(String(val).replace(/,/g, '.'))), // Allow comma as decimal separator
    z.number().min(0, "El precio unitario estimado debe ser no negativo")
  ),
  profitMargin: z.preprocess(
    (val) => (String(val).trim() === '' ? null : Number(String(val).replace(/,/g, '.'))), // Allow comma as decimal separator
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
        // Ensure required headers are present
        const requiredHeaders = ['title', 'unitOfMeasure', 'estimatedUnitPrice']; // Only these are strictly required now
        for(const header of requiredHeaders) {
            if(!(header in row)) {
                throw new Error(`Falta la columna requerida: ${header}`);
            }
        }

        const validatedRow = csvMaterialRowSchema.parse(row);
        
        const newMaterialProjectData = {
          projectId: new mongoose.Types.ObjectId(projectId),
          ...validatedRow,
          referenceCode: validatedRow.referenceCode || null, // Ensure null if not provided
          brand: validatedRow.brand || null,
          supplier: validatedRow.supplier || null,
          description: validatedRow.description || null,
          profitMargin: validatedRow.profitMargin === undefined ? null : validatedRow.profitMargin,
        };

        // Removed check for duplicate referenceCode as it's no longer unique
        
        const newMaterialProject = new MaterialProject(newMaterialProjectData);
        await newMaterialProject.save();
        createdMaterials.push(newMaterialProject.toObject() as MaterialProjectType);

      } catch (error: any) {
        if (error instanceof z.ZodError) {
          errors.push({ row: i + 2, message: 'Error de validación de datos.', details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') });
        } else {
          // Handle other potential errors, e.g., database errors not related to duplicate keys
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
      { status: errors.length > 0 && createdMaterials.length === 0 ? 400 : 201 } 
    );

  } catch (error: any) {
    console.error(`Error importing materials from CSV for project ${projectId}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to import materials from CSV.',
      error: error.message || String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
