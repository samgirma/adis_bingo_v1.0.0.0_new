import { useState, useEffect, useRef } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, X, Settings, Trophy, Eye, EyeOff, Edit, Trash2, Sparkles } from "lucide-react";
import { customBingoVoice } from "@/lib/custom-voice-synthesis";
import Papa from 'papaparse';

interface BingoEmployeeDashboardProps {
  onLogout: () => void;
}

type GameState = 'SETTING' | 'REGISTERING' | 'PLAYING' | 'REPORT';

export default function BingoEmployeeDashboard({ onLogout }: BingoEmployeeDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Game state management
  const [gameState, setGameState] = useState<GameState>('SETTING');
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [speed, setSpeed] = useState(7);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [checkCardInput, setCheckCardInput] = useState("");
  const [wasAutoCalling, setWasAutoCalling] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [topUpFee, setTopUpFee] = useState("10");
  const [rechargeFile, setRechargeFile] = useState<File | null>(null);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [previewCard, setPreviewCard] = useState<any | null>(null);
  const [isCallingNumber, setIsCallingNumber] = useState(false);
  const [isAutoCalling, setIsAutoCalling] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCard, setEditingCard] = useState<number | null>(null);
  const [viewingCard, setViewingCard] = useState<number | null>(null);
  const [checkedCardResult, setCheckedCardResult] = useState<{
    cartelaNumber: number;
    isWinner: boolean;
    pattern?: string;
    cardNumbers: number[][];
  } | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>("arada");
  const autoCallInterval = useRef<NodeJS.Timeout | null>(null);
  const calledNumbersRef = useRef<number[]>([]);

  // Cartela Management state
  const [showCartelaManagement, setShowCartelaManagement] = useState(false);
  const [cartelaSearchTerm, setCartelaSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [manualCartelaGrid, setManualCartelaGrid] = useState<number[][]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'import' | 'manual' | 'table'>('import');
  const [importProgress, setImportProgress] = useState<number>(0);
  const [isImporting, setIsImporting] = useState(false);
  const [editingCartela, setEditingCartela] = useState<any>(null);
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cartelaToDelete, setCartelaToDelete] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState<{ cartelaNumber: number; pattern: string } | null>(null);

  // CSV Import mutation
  const csvImportMutation = useMutation({
    mutationFn: async (cartelaData: any[]) => {
      const response = await fetch('/api/cartelas/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cartelas: cartelaData }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to import cartelas');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Reset progress state
      setImportProgress(100);
      setIsImporting(false);
      
      // Show detailed import status
      // Check if import was successful (has imported field and no critical errors)
      if (data.imported !== undefined || data.total !== undefined) {
        let message = `Successfully processed ${data.total || 0} cartelas`;
        
        if (data.imported > 0) {
          message += ` - ${data.imported} imported/updated`;
        }
        
        if (data.errors && data.errors.length > 0) {
          message += ` (${data.errors.length} failed)`;
        }
        
        toast({
          title: "CSV Import Complete",
          description: message,
          variant: "default"
        });
        
        // Show error details in console for debugging
        if (data.errors && data.errors.length > 0) {
          console.log('Import errors:', data.errors);
        }
        
        // Refresh cartelas data to show latest imports
        refetch();
        
        // Close cartela management dialog after successful import
        setTimeout(() => {
          setShowCartelaManagement(false);
        }, 2000);
        
      } else {
        toast({
          title: "CSV Import Failed",
          description: "Failed to import cartelas",
          variant: "destructive"
        });
      }
      
      // Reset form after short delay
      setTimeout(() => {
        setCsvFile(null);
        setImportProgress(0);
      }, 1000);
    },
    onError: (error) => {
      setImportProgress(0);
      setIsImporting(false);
      toast({
        title: "CSV Import Failed",
        description: error.message || "Failed to import cartelas. Please check the file format.",
        variant: "destructive"
      });
    },
  });

  // Save Manual Cartela mutation
  const saveManualCartelaMutation = useMutation({
    mutationFn: async (grid: number[][]) => {
      const response = await fetch('/api/cartelas/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid })
      });
      if (!response.ok) throw new Error('Failed to save manual cartela');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cartelas'] });
      toast({
        title: "Success",
        description: "Manual cartela saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save manual cartela",
        variant: "destructive"
      });
    }
  });

  // Update Cartela mutation
  const updateCartelaMutation = useMutation({
    mutationFn: async ({ id, cartelaNumber, name, pattern }: { id: number; cartelaNumber: number; name: string; pattern: number[][] }) => {
      const response = await fetch(`/api/cartelas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartelaNumber, name, pattern: JSON.stringify(pattern) })
      });
      if (!response.ok) throw new Error('Failed to update cartela');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cartelas'] });
      setIsEditingPreview(false);
      setEditingCartela(null);
      setPreviewCard(null);
      toast({
        title: "Success",
        description: "Cartela updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update cartela",
        variant: "destructive"
      });
    }
  });

  // Delete Cartela mutation
  const deleteCartelaMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cartelas/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete cartela');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cartelas'] });
      setShowDeleteConfirm(false);
      setCartelaToDelete(null);
      toast({
        title: "Success",
        description: "Cartela deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete cartela",
        variant: "destructive"
      });
    }
  });

  // Handle CSV Import
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
    }
  };

  // Handle Top Up File
  const handleTopUpFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed', e.target.files);
    const file = e.target.files?.[0];
    if (file) {
      console.log('Processing file:', file.name, file.size);
      setRechargeFile(file);
      processTopUpFile(file);
    } else {
      console.log('No file selected');
    }
  };

  // Process Top Up File
  const processTopUpFile = async (file: File) => {
    console.log('Starting to process top-up file:', file.name);
    
    // Validate file type
    if (!file.name.endsWith('.enc')) {
      console.log('Invalid file type:', file.name);
      toast({
        title: "Invalid File Type",
        description: "Please upload a valid .enc file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      console.log('File too large:', file.size);
      toast({
        title: "File Too Large",
        description: "File size must be less than 1MB",
        variant: "destructive"
      });
      return;
    }

    console.log('File validation passed, reading file...');
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const encryptedData = e.target?.result as string;
      
      console.log('File read complete. Data length:', encryptedData?.length);
      console.log('File read complete. Data preview:', encryptedData?.substring(0, 200));
      
      if (!encryptedData) {
        console.log('No encrypted data found');
        toast({
          title: "File Read Error",
          description: "Failed to read the uploaded file. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Validate encrypted data format
      if (encryptedData.length < 50) {
        console.log('File too short:', encryptedData.length);
        toast({
          title: "Invalid File Format",
          description: "The uploaded file appears to be corrupted or incomplete.",
          variant: "destructive"
        });
        return;
      }

      try {
        console.log('Sending POST request to /api/recharge/topup');
        console.log('Encrypted data length:', encryptedData.length);
        console.log('Encrypted data preview:', encryptedData.substring(0, 100) + '...');
        
        toast({
          title: "Processing File",
          description: "Verifying encrypted balance file...",
        });

        const response = await fetch('/api/recharge/topup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ encryptedData }),
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response result:', result);

        if (!response.ok) {
          console.log('Error response:', result);
          // Handle specific error types based on error codes
          if (result.error === 'INVALID_FILE_DATA') {
            throw new Error("Invalid file data. Please upload a valid .enc balance file.");
          } else if (result.error === 'INVALID_JSON_FORMAT') {
            throw new Error("Invalid file format. The file appears to be corrupted or not a valid balance file.");
          } else if (result.error === 'MISSING_REQUIRED_FIELDS') {
            throw new Error("Invalid balance file structure. Missing required payload or signature data.");
          } else if (result.error === 'MISSING_TRANSACTION_DATA') {
            throw new Error("Invalid balance file data. Missing transaction ID or amount information.");
          } else if (result.error === 'INVALID_AMOUNT') {
            throw new Error("Invalid amount. The amount must be a positive number.");
          } else if (result.error === 'INVALID_TRANSACTION_ID') {
            throw new Error("Invalid transaction ID. The transaction ID must be a non-empty string.");
          } else if (result.error === 'INVALID_ACCOUNT_NUMBER') {
            throw new Error("Invalid employee account number format in the balance file.");
          } else if (result.error === 'WRONG_ACCOUNT') {
            throw new Error("This balance file is for a different account. Please use your own balance file.");
          } else if (result.message?.includes('already been used') || result.message?.includes('already been redeemed')) {
            throw new Error("This balance file has already been used. Each file can only be used once.");
          } else if (result.message?.includes('signature') || result.message?.includes('tampered')) {
            throw new Error("Invalid signature. The file may have been tampered with or is not authentic.");
          } else if (result.message?.includes('decrypt') || result.message?.includes('corrupted')) {
            throw new Error("Invalid or corrupted balance file. The file may be damaged or not properly encrypted.");
          } else if (result.message?.includes('expired')) {
            throw new Error("This balance file has expired. Please contact support for a new file.");
          } else {
            throw new Error(result.message || 'Failed to process balance file');
          }
        }

        toast({
          title: "Success!",
          description: `Balance topped up successfully! Amount: ${result.amount} ETB`,
        });

        // Refresh user data to get updated balance
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        
      } catch (error: any) {
        console.error('Top-up error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        let errorMessage = "Failed to process balance file";
        
        // Provide specific error messages based on error type
        if (error.message?.includes('Failed to fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message?.includes('decrypt')) {
          errorMessage = "Invalid encryption. The file is not properly encrypted or is corrupted.";
        } else if (error.message?.includes('signature')) {
          errorMessage = "Invalid signature. The file may be tampered with or not authentic.";
        } else if (error.message?.includes('already been used')) {
          errorMessage = "This balance file has already been used. Each file can only be used once.";
        } else if (error.message?.includes('another account')) {
          errorMessage = "This balance file is for a different account. Please use your own balance file.";
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        console.log('Final error message to show:', errorMessage);
        
        toast({
          title: "Top-Up Failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: "File Read Error",
        description: "Failed to read the uploaded file. Please try again.",
        variant: "destructive"
      });
    };

    reader.readAsText(file);
  };

  // Process CSV file (separate from file input handler)
  const processCSVImport = () => {
    if (!csvFile) return;

    setIsImporting(true);
    setImportProgress(0);

    // Debug: log the raw file content first
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawContent = e.target?.result as string;
      console.log('Raw CSV content:', rawContent);
      console.log('File size:', csvFile.size);
      console.log('File type:', csvFile.type);
      
      // Parse with PapaParse
      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false, // Keep everything as strings for manual parsing
        complete: (results) => {
          console.log('PapaParse results:', JSON.stringify(results, null, 2));
          console.log('Data length:', results.data.length);
          console.log('First row:', JSON.stringify(results.data[0], null, 2));
          console.log('Errors:', JSON.stringify(results.errors, null, 2));
          console.log('Meta:', JSON.stringify(results.meta, null, 2));
          
          try {
            const totalRows = results.data.length;
            let processedCount = 0;

            const cartelaData = results.data.map((row: any) => {
            
            // Parse CSV row according to format: cno,user_id,card_no,b,i,n,g,o
            const cno = parseInt(row.cno);
            const userId = user?.id || 1; // Override with current logged-in user ID
            const cardNo = parseInt(row.card_no);
             
            // Parse B,I,N,G,O columns from string arrays to number arrays
            // Each column contains all values for that column (column-based format)
            const b = row.b ? row.b.split(',').map((n: string) => parseInt(n.trim())) : [];
            const i = row.i ? row.i.split(',').map((n: string) => parseInt(n.trim())) : [];
            const n = row.n ? row.n.split(',').map((n: string) => parseInt(n.trim())) : [];
            const g = row.g ? row.g.split(',').map((n: string) => parseInt(n.trim())) : [];
            const o = row.o ? row.o.split(',').map((n: string) => parseInt(n.trim())) : [];
          
            // Combine into 5x5 grid (5 rows x 5 columns)
            // Each array contains all values for that column
            const grid: number[][] = [];
            for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
              grid[rowIndex] = [
                b[rowIndex] || 0,  // B column value for this row
                i[rowIndex] || 0,  // I column value for this row
                n[rowIndex] || 0,  // N column value for this row
                g[rowIndex] || 0,  // G column value for this row
                o[rowIndex] || 0   // O column value for this row
              ];
            }

            // Update progress during processing
            processedCount++;
            const processingProgress = 50 + Math.floor((processedCount / totalRows) * 50);
            setImportProgress(Math.min(99, processingProgress));

            return {
              cno,
              user_id: userId, // Override with current logged-in user ID
              card_no: cardNo,
              // Send raw B,I,N,G,O columns for server-side processing
              b: row.b,
              i: row.i,
              n: row.n,
              g: row.g,
              o: row.o
            };
          });

          // Final progress update before API call
          setImportProgress(99);

          csvImportMutation.mutate(cartelaData);
        } catch (error) {
          setIsImporting(false);
          setImportProgress(0);
          toast({
            title: "CSV Parse Error",
            description: "Failed to parse CSV file. Please check the format.",
            variant: "destructive"
          });
        }
      },
      error: (error) => {
        console.error('PapaParse error:', error);
        setIsImporting(false);
        setImportProgress(0);
        toast({
          title: "CSV Read Error",
          description: "Failed to read CSV file",
          variant: "destructive"
        });
      }
      });
    };
    reader.readAsText(csvFile);
  };

  // Handle Save Manual Cartela
  const handleSaveManualCartela = () => {
    // Validate grid structure
    if (manualCartelaGrid.length !== 5 || manualCartelaGrid.some(row => row.length !== 5)) {
      toast({
        title: "Invalid Grid",
        description: "Please fill in all 25 cells of the bingo grid",
        variant: "destructive"
      });
      return;
    }

    // Check if center cell (N3) is 0 (free space)
    if (manualCartelaGrid[2][2] !== 0) {
      toast({
        title: "Invalid Grid",
        description: "The center cell (N3) must be 0 (Free Space)",
        variant: "destructive"
      });
      return;
    }

    // Validate column ranges and duplicates
    const columnRanges = [
      { name: 'B', min: 1, max: 15, col: 0 },
      { name: 'I', min: 16, max: 30, col: 1 },
      { name: 'N', min: 31, max: 45, col: 2 },
      { name: 'G', min: 46, max: 60, col: 3 },
      { name: 'O', min: 61, max: 75, col: 4 }
    ];

    for (const column of columnRanges) {
      const columnValues = [];
      for (let row = 0; row < 5; row++) {
        // Skip center cell for N column
        if (column.name === 'N' && row === 2) continue;
        
        const value = manualCartelaGrid[row][column.col];
        if (!value || value === 0) {
          toast({
            title: "Invalid Grid",
            description: `Column ${column.name} has empty cells`,
            variant: "destructive"
          });
          return;
        }
        
        // Check range
        if (value < column.min || value > column.max) {
          toast({
            title: "Invalid Range",
            description: `Column ${column.name} must contain numbers between ${column.min}-${column.max}`,
            variant: "destructive"
          });
          return;
        }
        
        columnValues.push(value);
      }

      // Check for duplicates in column
      const uniqueValues = new Set(columnValues);
      if (uniqueValues.size !== columnValues.length) {
        toast({
          title: "Duplicate Numbers",
          description: `Column ${column.name} contains duplicate numbers`,
          variant: "destructive"
        });
        return;
      }
    }

    // Check for unique card number by comparing with existing cartelas
    if (cartelas && cartelas.length > 0) {
      const existingCardNumbers = new Set(cartelas.map(c => c.cardNo || c.cartelaNumber));
      const newCardNumber = Math.max(...cartelas.map(c => c.cardNo || c.cartelaNumber)) + 1;
      
      if (existingCardNumbers.has(newCardNumber)) {
        toast({
          title: "Duplicate Card Number",
          description: `Card number ${newCardNumber} already exists. Please use a unique card number.`,
          variant: "destructive"
        });
        return;
      }
    }

    saveManualCartelaMutation.mutate(manualCartelaGrid);
  };

  // Handle Manual Cartela Change
  const handleManualCartelaChange = (row: number, col: number, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
    
    // Create a new grid to avoid direct mutation
    const newGrid = [...manualCartelaGrid];
    
    // Ensure the row exists
    if (!newGrid[row]) {
      newGrid[row] = [];
    }
    
    // Update the cell value
    newGrid[row][col] = numValue;
    
    setManualCartelaGrid(newGrid);
  };

  // Initialize voice selection
  useEffect(() => {
    const voices = customBingoVoice.getAvailableVoices();
    if (voices.length > 0) {
      const currentVoice = customBingoVoice.getCurrentVoice();
      if (currentVoice) {
        setSelectedVoice(currentVoice.name);
      }
    }
  }, []);

  // Generate 15x5 grid (1-75)
  const generateBingoGrid = () => {
    const grid: number[][] = [];
    for (let row = 0; row < 5; row++) {
      const rowNumbers: number[] = [];
      for (let col = 0; col < 15; col++) {
        const num = row * 15 + col + 1;
        rowNumbers.push(num);
      }
      grid.push(rowNumbers);
    }
    return grid;
  };

  const bingoGrid = generateBingoGrid();

  // Active game query
  const { data: activeGame } = useQuery({
    queryKey: ['/api/games/active'],
    refetchInterval: 5000
  });

  // Game history query
  const { data: gameHistory } = useQuery({
    queryKey: ['/api/game-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/game-history/${user.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Update called numbers mutation
  const updateCalledNumbersMutation = useMutation({
    mutationFn: async ({ gameId, calledNumbers }: { gameId: number; calledNumbers: number[] }) => {
      const response = await fetch(`/api/games/${gameId}/numbers`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ calledNumbers }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update called numbers');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Don't invalidate active game query to prevent race conditions
      // Local state is the source of truth
    },
    onError: (error: any) => {
      console.error('Failed to save called numbers:', error);
      toast({
        title: "Warning",
        description: "Number called but not saved to server",
        variant: "destructive"
      });
    },
  });

  // Handle Edit Cartela (opens preview modal in edit mode)
  const handleEditCartela = (cartela: any) => {
    setEditingCartela({
      ...cartela,
      pattern: cartela.pattern || []
    });
    setIsEditingPreview(true);
    setPreviewCard(cartela);
  };

  // Handle Update Cartela
  const handleUpdateCartela = () => {
    if (!editingCartela) return;
    
    updateCartelaMutation.mutate({
      id: editingCartela.id,
      cartelaNumber: editingCartela.cartelaNumber,
      name: editingCartela.name,
      pattern: editingCartela.pattern
    });
  };

  // Handle Delete Cartela
  const handleDeleteCartela = (cartela: any) => {
    setCartelaToDelete(cartela);
    setShowDeleteConfirm(true);
  };

  // Confirm Delete
  const confirmDelete = () => {
    if (cartelaToDelete) {
      deleteCartelaMutation.mutate(cartelaToDelete.id);
    }
  };

  // Handle Cartela Grid Change in Edit
  const handleEditCartelaChange = (row: number, col: number, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
    const newGrid = [...editingCartela.pattern];
    
    if (!newGrid[row]) {
      newGrid[row] = [];
    }
    
    newGrid[row][col] = numValue;
    setEditingCartela({
      ...editingCartela,
      pattern: newGrid
    });
  };

// Initialize called numbers from backend when component mounts or game changes
  useEffect(() => {
    if (activeGame && (activeGame as any)?.calledNumbers && Array.isArray((activeGame as any).calledNumbers) && calledNumbers.length === 0) {
      // Only initialize if we don't have any local numbers yet
      const backendNumbers = (activeGame as any).calledNumbers.map((n: any) => typeof n === 'string' ? parseInt(n) : n);
      setCalledNumbers(backendNumbers);
      if (backendNumbers.length > 0) {
        setCurrentNumber(backendNumbers[backendNumbers.length - 1]);
      }
    }
  }, [activeGame]);

  // Sync calledNumbersRef with calledNumbers state
  useEffect(() => {
    calledNumbersRef.current = calledNumbers;
  }, [calledNumbers]);

  // Helper function to get letter for number
  const { data: cartelas, isLoading: cartelasQueryLoading, refetch } = useQuery({
    queryKey: ['/api/cartelas', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/cartelas/${user.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id, // Only enabled when user is logged in
  });

  // Helper function to get letter for number
  const getLetterForNumber = (num: number): string => {
    if (num >= 1 && num <= 15) return "B";
    if (num >= 16 && num <= 30) return "I";
    if (num >= 31 && num <= 45) return "N";
    if (num >= 46 && num <= 60) return "G";
    if (num >= 61 && num <= 75) return "O";
    return "";
  };

  // Get color for BINGO letters
  const getLetterColor = (letter: string): string => {
    switch (letter) {
      case "B": return "bg-blue-900 text-white"; // Navy
      case "I": return "bg-red-600 text-white"; // Red
      case "N": return "bg-gray-400 text-black"; // Gray with black text
      case "G": return "bg-green-600 text-white"; // Green
      case "O": return "bg-yellow-400 text-black"; // Yellow
      default: return "bg-gray-600 text-white";
    }
  };

  // Get ball gradient color
  const getBallGradient = (num: number): string => {
    if (num >= 1 && num <= 15) return "from-blue-500 to-blue-700";
    if (num >= 16 && num <= 30) return "from-red-500 to-red-700";
    if (num >= 31 && num <= 45) return "from-white to-gray-200"; // White background for N column in game floor
    if (num >= 46 && num <= 60) return "from-green-500 to-green-700";
    if (num >= 61 && num <= 75) return "from-yellow-500 to-yellow-700";
    return "from-gray-600 to-gray-800";
  };

  // Call number handler with voice synthesis
  const handleCallNumber = async () => {
    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
      .filter(n => !calledNumbersRef.current.includes(n));

    if (availableNumbers.length === 0) {
      // Stop auto-calling if all numbers are called
      stopAutoCalling();
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const newNumber = availableNumbers[randomIndex];

    setIsCallingNumber(true);

    // Update UI state immediately using functional update
    setCurrentNumber(newNumber);
    const newCalledNumbers = [...calledNumbersRef.current, newNumber];
    setCalledNumbers(prev => [...prev, newNumber]);
    
    // Save to backend if there's an active game
    if ((activeGame as any)?.id) {
      updateCalledNumbersMutation.mutate({
        gameId: (activeGame as any).id,
        calledNumbers: newCalledNumbers
      });
    }

    // Play voice announcement immediately (non-blocking)
    customBingoVoice.callNumber(newNumber).catch(error => {
      console.error('Error calling number:', error);
      // Voice error doesn't affect the game state
    });
    
    setIsCallingNumber(false);
  };

  // Start auto-calling
  const startAutoCalling = () => {
    if (isAutoCalling) return;
    
    setIsAutoCalling(true);
    
    // Call first number immediately
    handleCallNumber();
    
    // Then call numbers at intervals based on speed
    const intervalMs = Math.max(1000, 11000 - (speed * 1000)); // Speed 1=10s, 10=1s
    autoCallInterval.current = setInterval(() => {
      handleCallNumber();
    }, intervalMs);
  };

  // Stop auto-calling
  const stopAutoCalling = () => {
    setIsAutoCalling(false);
    if (autoCallInterval.current) {
      clearInterval(autoCallInterval.current);
      autoCallInterval.current = null;
    }
  };

  // Toggle auto-calling
  const toggleAutoCalling = () => {
    if (isAutoCalling) {
      stopAutoCalling();
    } else {
      startAutoCalling();
    }
  };

  // Shuffle effect - shows all 75 cards in random order
  const handleShuffle = async () => {
    if (isShuffling) return;
    
    // Pause the game when shuffling
    const wasAutoCalling = isAutoCalling;
    if (isAutoCalling) {
      setWasAutoCalling(true);
      stopAutoCalling();
    } else {
      setWasAutoCalling(false);
    }
    
    setIsShuffling(true);
    
    // Get shuffle audio duration and sync with animation
    try {
      const audio = new Audio('/voices/common/shuffle.mp3');
      
      audio.addEventListener('loadedmetadata', () => {
        const audioDuration = audio.duration * 1000; // Convert to milliseconds
        const animationDuration = Math.max(audioDuration, 3000); // Use audio duration or 3s minimum
        
        // Play shuffle sound
        customBingoVoice.playShuffle().catch(error => {
          console.warn('Error playing shuffle sound:', error);
        });
        
        // Stop shuffling when audio completes (synchronized)
        setTimeout(() => {
          setIsShuffling(false);
          // Resume auto-calling if it was active before
          if (wasAutoCalling) {
            setWasAutoCalling(false);
            startAutoCalling();
          }
        }, animationDuration);
      });
      
      audio.addEventListener('error', () => {
        console.warn('Could not load shuffle audio, using default 3s duration');
        
        // Play shuffle sound anyway
        customBingoVoice.playShuffle().catch(error => {
          console.warn('Error playing shuffle sound:', error);
        });
        
        // Use default 3-second duration
        setTimeout(() => {
          setIsShuffling(false);
          if (wasAutoCalling) {
            setWasAutoCalling(false);
            startAutoCalling();
          }
        }, 3000);
      });
      
      // Load the audio to get duration
      audio.load();
      
    } catch (error) {
      console.warn('Error setting up shuffle audio:', error);
      
      // Fallback: play sound and use default 3s duration
      customBingoVoice.playShuffle().catch(error => {
        console.warn('Error playing shuffle sound:', error);
      });
      
      setTimeout(() => {
        setIsShuffling(false);
        if (wasAutoCalling) {
          setWasAutoCalling(false);
          startAutoCalling();
        }
      }, 3000);
    }
  };

  // Force re-render for checked card result
  const [, forceUpdate] = useState({});

  // Clean up interval on component unmount
  useEffect(() => {
    return () => {
      if (autoCallInterval.current) {
        clearInterval(autoCallInterval.current);
      }
    };
  }, []);

  // Update interval when speed changes
  useEffect(() => {
    if (isAutoCalling) {
      // Only restart if we're actually auto-calling
      // Don't stop and start immediately - just update the interval
      if (autoCallInterval.current) {
        clearInterval(autoCallInterval.current);
      }
      
      const intervalMs = Math.max(1000, 11000 - (speed * 1000));
      autoCallInterval.current = setInterval(() => {
        handleCallNumber();
      }, intervalMs);
    }
  }, [speed, isAutoCalling]);


  const handleCheckCard = async () => {
    console.log('handleCheckCard called, checkCardInput:', checkCardInput, 'gameState:', gameState);
    
    // Pause the game when checking card
    if (isAutoCalling) {
      setWasAutoCalling(true);
      stopAutoCalling();
    } else {
      setWasAutoCalling(false);
    }
    
    if (!checkCardInput) {
      toast({
        title: "No Card Number",
        description: "Please enter a cartela number to check",
        variant: "destructive"
      });
      return;
    }

    const cartelaNumber = parseInt(checkCardInput);
    if (isNaN(cartelaNumber) || cartelaNumber <= 0) {
      toast({
        title: "Invalid Card Number",
        description: "Please enter a valid cartela number",
        variant: "destructive"
      });
      return;
    }

    // Check if cartela is registered for this game
    const isRegistered = selectedCards.has(cartelaNumber);
    console.log('Cartela:', cartelaNumber, 'isRegistered:', isRegistered, 'selectedCards:', Array.from(selectedCards));
    
    if (!isRegistered) {
      // Clear any previous result
      setCheckedCardResult(null);
      
      // Set not registered message to display in small popup
      setCheckedCardResult({
        cartelaNumber,
        isWinner: false,
        pattern: undefined,
        cardNumbers: []
      });
      
      // Force re-render
      forceUpdate({});
      
      // Play "not registered" audio (non-blocking)
      customBingoVoice.playNotRegistered().catch(error => {
        console.warn('Error playing not registered audio:', error);
      });
      
      // Clear the message after 3 seconds
      setTimeout(() => {
        setCheckedCardResult(null);
        forceUpdate({});
      }, 3000);
      
      return;
    }

    // Cartela is registered - generate card layout with marked numbers
    const cardNumbers = generateCardNumbersWithCalled(cartelaNumber);
    console.log('Generated card numbers:', cardNumbers);
    
    // Check if it's a winner
    const result = checkCardWinner(cartelaNumber);
    console.log('Winner check result:', result);
    
    // Set the checked card result to display
    const resultData = {
      cartelaNumber,
      isWinner: result.isWinner,
      pattern: result.pattern,
      cardNumbers
    };
    console.log('Setting checkedCardResult to:', resultData);
    setCheckedCardResult(resultData);
    
    // Force re-render
    forceUpdate({});
    
    // Play appropriate audio immediately (non-blocking)
    if (result.isWinner) {
      // Trigger celebration for winners
      setWinnerInfo({ cartelaNumber, pattern: result.pattern || 'Unknown Pattern' });
      setShowCelebration(true);
      
      // Hide celebration after 5 seconds
      setTimeout(() => {
        setShowCelebration(false);
        setWinnerInfo(null);
      }, 5000);
      
      customBingoVoice.announceWinner(cartelaNumber, true).catch(error => {
        console.warn('Error playing winner audio:', error);
      });
    } else {
      customBingoVoice.announceWinner(cartelaNumber, false).catch(error => {
        console.warn('Error playing not winner audio:', error);
      });
    }
  };

  // Start game with voice announcement
  const handleStartGame = async () => {
    if (selectedCards.size === 0) {
      toast({
        title: "No Cards Selected",
        description: "Please select at least one card to start the game",
        variant: "destructive"
      });
      return;
    }

    const cardFee = parseInt(topUpFee);
    const totalCollected = selectedCards.size * cardFee;
    
    // Calculate deduction based on number of cards (not card fee)
    let deductionAmount;
    if (selectedCards.size <= 1) {
      deductionAmount = 0; // 0 or 1 cards: no deduction
    } else if (selectedCards.size >= 2 && selectedCards.size <= 5) {
      deductionAmount = 10; // 2-5 cards: 10 ETB deduction
    } else if (selectedCards.size >= 6 && selectedCards.size <= 12) {
      deductionAmount = 20; // 6-12 cards: 20 ETB deduction
    } else {
      deductionAmount = 30; // 13+ cards: 30 ETB deduction
    }

    // Calculate winner reward: total collected - deduction
    // But winner gets 0 if 0 or 1 cards registered
    let winnerReward;
    if (selectedCards.size <= 1) {
      winnerReward = 0; // 0 or 1 cards = 0 ETB reward
    } else {
      winnerReward = totalCollected - deductionAmount;
    }

    const remainingBalance = (user as any)?.balance || 0;

    // Check if employee has sufficient balance (only if deduction > 0)
    if (deductionAmount > 0 && remainingBalance < deductionAmount) {
      toast({
        title: "Insufficient Balance",
        description: `Required: ${deductionAmount} ETB for game fee. Available: ${remainingBalance.toFixed(2)} ETB. Please recharge to continue.`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Only deduct game fee if deduction amount > 0
      if (deductionAmount > 0) {
        const response = await fetch('/api/games/deduct-balance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: deductionAmount.toFixed(2),
            cardCount: selectedCards.size,
            cardFee: cardFee,
            totalCollected: totalCollected.toFixed(2),
            winnerReward: winnerReward.toFixed(2),
            description: `Game fee for ${selectedCards.size} cards at ${cardFee} ETB each. Total: ${totalCollected} ETB, Fee: ${deductionAmount} ETB, Winner reward: ${winnerReward} ETB`
          })
        });

        if (!response.ok) {
          throw new Error('Failed to deduct balance');
        }

        // Refresh user balance
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      }

      toast({
        title: "Game Started",
        description: deductionAmount > 0 ? `Game fee ${deductionAmount} ETB deducted. Winner will receive ${winnerReward} ETB` : `Game started. Winner will receive ${winnerReward} ETB`,
        variant: "default"
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deduct balance. Please try again.",
        variant: "destructive"
      });
      return;
    }

    // Announce game start (non-blocking)
    customBingoVoice.announceGameStart().catch(error => {
      console.error('Error announcing game start:', error);
    });
    
    setGameState('PLAYING');
    // Game started toast removed as requested
  };

  // Render card grid for preview
  const renderCardGrid = (card: any) => {
    const cardNumbers = card.pattern;
    if (!cardNumbers || !Array.isArray(cardNumbers)) {
      return (
        <div className="col-span-5 text-center text-gray-500 py-8">
          No card data available
        </div>
      );
    }

    // Create rows of 5 cells each
    return Array.from({ length: 5 }, (_, row) => (
      <div key={row} className="grid grid-cols-5 gap-1 mb-1">
        {Array.from({ length: 5 }, (_, col) => {
          const isFreeSpace = row === 2 && col === 2; // Center space
          const number = cardNumbers[row]?.[col];

          return (
            <div
              key={col}
              className={`w-12 h-12 border-2 flex items-center justify-center text-lg font-bold rounded ${
                isFreeSpace 
                  ? 'bg-yellow-400 text-black border-yellow-600' 
                  : number && number > 0
                    ? 'bg-white border-gray-300 text-gray-800'
                    : 'bg-gray-100 border-gray-200 text-gray-400'
              }`}
            >
              {isFreeSpace ? '★' : (number || '')}
            </div>
          );
        })}
      </div>
    ));
  };

  // Generate bingo card numbers for display
  const generateCardNumbers = (cardNum: number): number[][] => {
    // First try to get grid pattern from cartelas
    const masterCartela = cartelas?.find((c: any) => c.cardNo === cardNum);
    if (masterCartela && masterCartela.pattern) {
      try {
        return typeof masterCartela.pattern === 'string' ? JSON.parse(masterCartela.pattern) : masterCartela.pattern;
      } catch (error) {
        console.error('Error parsing cartela pattern:', error);
      }
    }

    // Fallback to generated grid if master cartela not found
    const seed = cardNum * 12345;
    const random = (min: number, max: number) => {
      const x = Math.sin(seed + min + max) * 10000;
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
    };

    const card: number[][] = [];

    // B column (1-15)
    const b = Array.from({ length: 5 }, () => random(1, 15));
    // I column (16-30)
    const i = Array.from({ length: 5 }, () => random(16, 30));
    // N column (31-45) with free space in middle
    const n = Array.from({ length: 2 }, () => random(31, 45));
    n.push(0); // Free space
    n.push(...Array.from({ length: 2 }, () => random(31, 45)));
    // G column (46-60)
    const g = Array.from({ length: 5 }, () => random(46, 60));
    // O column (61-75)
    const o = Array.from({ length: 5 }, () => random(61, 75));

    card.push(b, i, n, g, o);
    return card;
  };

  // Generate card numbers with called number highlighting
  const generateCardNumbersWithCalled = (cardNum: number): number[][] => {
    const card = generateCardNumbers(cardNum);
    
    // Mark called numbers by making them negative (for display logic)
    const markedCard = card.map(row => 
      row.map(num => {
        if (num === 0) return 0; // Free space
        return calledNumbers.includes(num) ? -num : num;
      })
    );
    
    return markedCard;
  };

  // Check if a card is a winner
  const checkCardWinner = (cardNum: number): { isWinner: boolean; pattern?: string } => {
    const card = generateCardNumbers(cardNum);
    
    // Check rows
    for (let row = 0; row < 5; row++) {
      let rowComplete = true;
      for (let col = 0; col < 5; col++) {
        const num = card[row][col];
        if (num !== 0 && !calledNumbers.includes(num)) {
          rowComplete = false;
          break;
        }
      }
      if (rowComplete) {
        return { isWinner: true, pattern: `Horizontal Row ${row + 1}` };
      }
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
      let colComplete = true;
      for (let row = 0; row < 5; row++) {
        const num = card[row][col];
        if (num !== 0 && !calledNumbers.includes(num)) {
          colComplete = false;
          break;
        }
      }
      if (colComplete) {
        const columnNames = ['B', 'I', 'N', 'G', 'O'];
        return { isWinner: true, pattern: `Vertical Column ${columnNames[col]}` };
      }
    }

    // Check diagonal 1 (top-left to bottom-right)
    let diag1Complete = true;
    for (let i = 0; i < 5; i++) {
      const num = card[i][i];
      if (num !== 0 && !calledNumbers.includes(num)) {
        diag1Complete = false;
        break;
      }
    }
    if (diag1Complete) {
      return { isWinner: true, pattern: 'Diagonal (Top-Left to Bottom-Right)' };
    }

    // Check diagonal 2 (top-right to bottom-left)
    let diag2Complete = true;
    for (let i = 0; i < 5; i++) {
      const num = card[i][4 - i];
      if (num !== 0 && !calledNumbers.includes(num)) {
        diag2Complete = false;
        break;
      }
    }
    if (diag2Complete) {
      return { isWinner: true, pattern: 'Diagonal (Top-Right to Bottom-Left)' };
    }

    return { isWinner: false };
  };

  // Celebration Component
  const Celebration = () => {
    if (!showCelebration) return null;

    return (
      <div className="fixed inset-0 pointer-events-none z-50">
        {/* Confetti/Flares Animation */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          >
            <div className={`text-4xl ${i % 3 === 0 ? 'text-yellow-400' : i % 3 === 1 ? 'text-red-500' : 'text-blue-500'}`}>
              {i % 4 === 0 ? '✨' : i % 4 === 1 ? '🎉' : i % 4 === 2 ? '🌟' : '🎊'}
            </div>
          </div>
        ))}
        
        {/* Winner Message */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-6 rounded-2xl shadow-2xl animate-pulse">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
                <Sparkles className="w-8 h-8" />
                WINNER!
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="text-xl">
                Card #{winnerInfo?.cartelaNumber}
              </div>
              <div className="text-lg mt-1">
                {winnerInfo?.pattern}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render bingo card component
  const renderBingoCard = (cardNum: number, isSelected: boolean) => {
    const cardNumbers = generateCardNumbers(cardNum);

    return (
      <div className={`relative transition-all duration-200 ${isSelected ? 'scale-105' : 'scale-100'}`}>
        <div
          className={`p-3 rounded-lg border-2 transition-all ${isSelected
            ? 'border-blue-600 bg-blue-50 shadow-lg'
            : 'border-gray-300 bg-white hover:border-blue-400 hover:shadow-md'
            }`}
        >
          {/* Card Header with Number and Eye Icon */}
          <div className="flex justify-between items-center mb-2">
            <div className="font-bold text-lg text-gray-700">Card #{cardNum}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedCard(cardNum);
              }}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              title="Show card layout"
            >
              <Eye className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Compact View - Simple card number display */}
          <div
            onClick={() => {
              const newSelected = new Set(selectedCards);
              if (isSelected) {
                newSelected.delete(cardNum);
              } else {
                newSelected.add(cardNum);
              }
              setSelectedCards(newSelected);
            }}
            className="cursor-pointer"
          >
            <div className={`p-4 rounded-lg border-2 transition-all ${isSelected
              ? 'border-blue-600 bg-blue-50 shadow-lg'
              : 'border-gray-300 bg-white hover:border-blue-400 hover:shadow-md'
              }`}>
              <div className="flex justify-between items-center">
                <div className="font-bold text-lg text-gray-700">Card #{cardNum}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedCard(cardNum);
                  }}
                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                  title="Show card layout"
                >
                  <Eye className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              {isSelected && (
                <div className="mt-2 bg-blue-600 text-white rounded px-2 py-1 text-center text-xs font-bold">
                  SELECTED
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Celebration Component */}
      <Celebration />
      {/* Game Setting Overlay */}
      {gameState === 'SETTING' && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white text-black rounded-lg shadow-2xl max-w-2xl w-full mx-4">
            {/* Header */}
            <div className="bg-gray-800 text-white px-6 py-3 rounded-t-lg flex justify-between items-center">
              <div className="flex gap-4 text-sm">
                <button onClick={onLogout} className="hover:text-blue-400 transition">
                  Logout
                </button>
                <button
                  onClick={() => setGameState('REGISTERING')}
                  className="hover:text-blue-400 transition"
                >
                  Register Card
                </button>
                <button
                  onClick={() => setGameState('REPORT')}
                  className="hover:text-blue-400 transition"
                >
                  Report
                </button>
              </div>
              <div className="text-sm">Round 1</div>
            </div>

            {/* Content */}
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">የጨዋታው ትእዛዝ</h2>

              {/* Card Preview Image */}
              <div className="bg-blue-600 rounded-lg p-6 mb-6 mx-auto max-w-md">
                <div className="bg-white rounded-lg p-4">
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    <div className="font-bold text-blue-900">B</div>
                    <div className="font-bold text-blue-900">I</div>
                    <div className="font-bold text-blue-900">N</div>
                    <div className="font-bold text-blue-900">G</div>
                    <div className="font-bold text-blue-900">O</div>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-sm">
                    {[15, 16, 39, 59, 66].map((n, i) => (
                      <div key={i} className="bg-white border-2 border-blue-900 rounded p-2 font-bold text-blue-900">
                        {n}
                      </div>
                    ))}
                    {[11, 28, 40, 51, 68].map((n, i) => (
                      <div key={i} className="bg-white border-2 border-blue-900 rounded p-2 font-bold text-blue-900">
                        {n}
                      </div>
                    ))}
                    {[12, 20].map((n, i) => (
                      <div key={i} className="bg-white border-2 border-blue-900 rounded p-2 font-bold text-blue-900">
                        {n}
                      </div>
                    ))}
                    <div className="bg-yellow-400 rounded p-2 flex items-center justify-center">
                      <span className="text-2xl">★</span>
                    </div>
                    {[56, 67].map((n, i) => (
                      <div key={i} className="bg-white border-2 border-blue-900 rounded p-2 font-bold text-blue-900">
                        {n}
                      </div>
                    ))}
                    {[3, 30, 35, 60, 72].map((n, i) => (
                      <div key={i} className="bg-white border-2 border-blue-900 rounded p-2 font-bold text-blue-900">
                        {n}
                      </div>
                    ))}
                    {[10, 24, 37, 53, 64].map((n, i) => (
                      <div key={i} className="bg-white border-2 border-blue-900 rounded p-2 font-bold text-blue-900">
                        {n}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-yellow-400 text-black font-bold py-2 rounded">
                    Card No 1
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setGameState('REGISTERING')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
              >
                Start
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Report View */}
      {gameState === 'REPORT' && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center">
              <h2 className="text-xl font-bold">Game Report & Balance</h2>
              <button onClick={() => setGameState('SETTING')} className="hover:text-red-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {/* Balance Section */}
              <div className="mb-6 bg-blue-50 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Current Balance</h3>
                <div className="text-4xl font-bold text-blue-600 mb-4">
                  {(user as any)?.balance || 0} ETB
                </div>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => document.getElementById('topup-file-input')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Top Up Balance (.enc file)
                </Button>
                <input
                  id="topup-file-input"
                  type="file"
                  accept=".enc"
                  onChange={handleTopUpFile}
                  className="hidden"
                />
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
