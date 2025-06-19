import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { searchClientsByName } from "@/lib/firebase";
import type { Client } from "@shared/schema";

interface ClientAutocompleteProps {
  onClientSelect: (client: Client) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ClientAutocomplete({
  onClientSelect,
  value,
  onChange,
  placeholder = "Digite o nome do cliente...",
  disabled = false
}: ClientAutocompleteProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const searchClients = async () => {
      if (value.length < 2) {
        setClients([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      try {
        const results = await searchClientsByName(value);
        setClients(results);
        setIsOpen(results.length > 0);
      } catch (error) {
        console.error('Error searching clients:', error);
        setClients([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchClients, 300);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClientClick = (client: Client) => {
    onChange(client.nome || '');
    onClientSelect(client);
    setIsOpen(false);
    setClients([]); // Clear suggestions immediately
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    // Only show suggestions if input is not empty and no client is selected
    if (e.target.value.trim() === '') {
      setIsOpen(false);
      setClients([]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full"
        autoComplete="off"
      />

      {isOpen && !loading && clients.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border shadow-lg">
          <div className="p-1">
            {clients.map((client) => (
              <div
                key={client.id}
                onClick={() => handleClientClick(client)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleClientClick(client);
                  }
                }}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 rounded-md transition-colors"
                tabIndex={0}
              >
                <div className="font-medium text-gray-900">{client.nome}</div>
                <div className="text-sm text-gray-500">{client.cpf}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading && (
        <div className="absolute z-50 w-full mt-1 p-3 bg-white border rounded-md shadow-lg">
          <div className="text-sm text-gray-500">Procurando...</div>
        </div>
      )}
    </div>
  );
}