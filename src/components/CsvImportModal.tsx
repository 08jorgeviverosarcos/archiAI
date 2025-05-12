
'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  projectId: string;
  importUrl: string; // e.g., `/api/projects/${projectId}/materials/import-csv`
  moduleName: string; // e.g., "Materiales del Proyecto"
  csvStructureExample: { header: string; description: string; required: boolean }[];
  csvTemplateHeaders: string[]; // Array of header strings for CSV template download
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  projectId,
  importUrl,
  moduleName,
  csvStructureExample,
  csvTemplateHeaders,
}) => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<{ row: number; message: string; details?: any }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === 'text/csv') {
        setSelectedFile(file);
        setImportErrors([]); // Clear previous errors
      } else {
        toast({
          variant: 'destructive',
          title: 'Archivo Inválido',
          description: 'Por favor, selecciona un archivo CSV.',
        });
        setSelectedFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        variant: 'destructive',
        title: 'Sin Archivo',
        description: 'Por favor, selecciona un archivo CSV para importar.',
      });
      return;
    }

    setIsImporting(true);
    setImportErrors([]);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(importUrl, {
        method: 'POST',
        body: formData,
        // No 'Content-Type' header for FormData, browser sets it with boundary
      });

      const result = await response.json();

      if (!response.ok) {
        setImportErrors(result.summary?.errors || [{ row: 0, message: result.message || 'Error desconocido en la importación.' }]);
        throw new Error(result.message || `Fallo al importar ${moduleName}`);
      }
      
      toast({
        title: 'Importación Exitosa',
        description: result.message || `${moduleName} importados correctamente.`,
      });
      if (result.summary?.errors && result.summary.errors.length > 0) {
        setImportErrors(result.summary.errors);
         toast({
            variant: "default", // or "warning" if you have one
            title: "Importación con Errores",
            description: `Algunas filas no pudieron ser importadas. Revisa los detalles a continuación. ${result.summary.successfulImports} importadas, ${result.summary.failedImports} fallidas.`
        });
      } else {
        setImportErrors([]); // Clear errors on full success
      }
      onImportSuccess();
      // Optionally close modal on success, or let user see errors
      // onClose(); 
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: `Error de Importación`,
        description: error.message || `Ocurrió un error al importar ${moduleName}.`,
      });
       if(!importErrors.length) { // Only set generic error if no specific errors were parsed
            setImportErrors([{row: 0, message: error.message || "Error desconocido en la importación."}]);
       }
    } finally {
      setIsImporting(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = csvTemplateHeaders.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `plantilla_${moduleName.toLowerCase().replace(/\s/g, '_')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setSelectedFile(null); setImportErrors([]); } }}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar {moduleName} desde CSV</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV con los datos de {moduleName.toLowerCase()}. Asegúrate de que la estructura del archivo coincida con el ejemplo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow py-2 pr-2">
            <div className="space-y-4">
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Estructura del CSV Esperada</AlertTitle>
                    <AlertDescription>
                        El archivo CSV debe tener las siguientes columnas en la primera fila (encabezados):
                        <ul className="list-disc pl-5 mt-2 text-xs">
                        {csvStructureExample.map((col, index) => (
                            <li key={index}>
                            <strong>{col.header}</strong> ({col.required ? 'Requerido' : 'Opcional'}): {col.description}
                            </li>
                        ))}
                        </ul>
                        <Button variant="link" size="sm" onClick={handleDownloadTemplate} className="p-0 h-auto mt-2">
                            <FileText className="h-3 w-3 mr-1" /> Descargar plantilla CSV
                        </Button>
                    </AlertDescription>
                </Alert>

                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="csv-file">Seleccionar Archivo CSV</Label>
                    <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} ref={fileInputRef} />
                    {selectedFile && <p className="text-xs text-muted-foreground">Archivo seleccionado: {selectedFile.name}</p>}
                </div>

                {importErrors.length > 0 && (
                <Alert variant="destructive" className="max-h-48 overflow-y-auto">
                    <AlertTitle>Errores de Importación</AlertTitle>
                    <AlertDescription>
                    <ul className="list-disc pl-5 text-xs">
                        {importErrors.map((err, index) => (
                        <li key={index}>
                            Fila {err.row}: {err.message} {err.details ? `(${err.details})` : ''}
                        </li>
                        ))}
                    </ul>
                    </AlertDescription>
                </Alert>
                )}
            </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4 border-t mt-auto">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} disabled={isImporting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleImport} disabled={!selectedFile || isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar {moduleName}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

