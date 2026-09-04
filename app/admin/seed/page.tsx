'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { seedDatabase } from '@/lib/db-seed';
import { DatabaseIcon, CheckCircleIcon, AlertCircleIcon, Loader2Icon } from 'lucide-react';

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const { success, error } = await seedDatabase();
      if (success) {
        setResult({
          success: true,
          message: 'Database successfully seeded with demo events, bookings, and users.',
        });
      } else {
        setResult({
          success: false,
          message: `Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'An unexpected error occurred during seeding.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background pb-12 pt-20">
      
      <div className="max-w-2xl mx-auto px-4 mt-20">
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <DatabaseIcon className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Database Seeder</CardTitle>
            <CardDescription>
              Populate your Firestore collections with high-quality mock data for the Zosavuta project.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                What will be seeded:
              </h3>
              <ul className="text-sm space-y-1 text-muted-foreground ml-6 list-disc">
                <li>6 Demo Events (Music, Tech, Sports, etc.)</li>
                <li>3 Demo Bookings/Orders</li>
                <li>2 Demo Users (Customer & Organizer)</li>
              </ul>
            </div>

            {result && (
              <div className={`p-4 rounded-lg flex items-start gap-3 text-sm ${
                result.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {result.success ? <CheckCircleIcon className="w-5 h-5 flex-shrink-0" /> : <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />}
                <p>{result.message}</p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button 
              onClick={handleSeed} 
              disabled={loading} 
              className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
                  Seeding Database...
                </>
              ) : (
                'Seed Mock Data'
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Note: This will overwrite existing documents with the same IDs in your Firestore.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
