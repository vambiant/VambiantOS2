'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@vambiant/ui';
import {
  calculateHoaiFee,
  getPhasePercentages,
  type HoaiServiceType,
  type HoaiZone,
  type HoaiFeeResult,
} from '@vambiant/domain';

const serviceTypes: { value: HoaiServiceType; label: string; paragraph: string }[] = [
  { value: 'gebaeude', label: 'Gebaeude und Innenraeume', paragraph: '§35' },
  { value: 'innenraeume', label: 'Innenraeume', paragraph: '§35' },
  { value: 'freianlagen', label: 'Freianlagen', paragraph: '§40' },
  { value: 'ingenieurbauwerke', label: 'Ingenieurbauwerke', paragraph: '§44' },
  { value: 'verkehrsanlagen', label: 'Verkehrsanlagen', paragraph: '§48' },
  { value: 'tragwerksplanung', label: 'Tragwerksplanung', paragraph: '§52' },
  { value: 'technische_ausruestung', label: 'Technische Ausruestung', paragraph: '§56' },
];

const zones: { value: HoaiZone; label: string; description: string }[] = [
  { value: 1, label: 'Zone I', description: 'Einfache Anforderungen' },
  { value: 2, label: 'Zone II', description: 'Durchschnittliche Anforderungen' },
  { value: 3, label: 'Zone III', description: 'Ueberdurchschnittliche Anforderungen' },
  { value: 4, label: 'Zone IV', description: 'Hohe Anforderungen' },
  { value: 5, label: 'Zone V', description: 'Sehr hohe Anforderungen' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function parseGermanNumber(str: string): number {
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return Number.parseFloat(cleaned) || 0;
}

export interface HoaiCalculatorState {
  serviceType: HoaiServiceType;
  zone: HoaiZone;
  eligibleCosts: number;
  selectedPhases: number[];
  conversionFactor: number;
  nebenkostenPercent: number;
  coordinationFactor: number;
  feeResult: HoaiFeeResult | null;
}

interface HoaiCalculatorProps {
  initialState?: Partial<HoaiCalculatorState>;
  onStateChange?: (state: HoaiCalculatorState) => void;
}

export function HoaiCalculator({ initialState, onStateChange }: HoaiCalculatorProps) {
  const [serviceType, setServiceType] = useState<HoaiServiceType>(
    initialState?.serviceType ?? 'gebaeude',
  );
  const [zone, setZone] = useState<HoaiZone>(initialState?.zone ?? 3);
  const [eligibleCostsStr, setEligibleCostsStr] = useState(
    initialState?.eligibleCosts
      ? new Intl.NumberFormat('de-DE').format(initialState.eligibleCosts)
      : '2.450.000',
  );
  const [selectedPhases, setSelectedPhases] = useState<number[]>(
    initialState?.selectedPhases ?? [1, 2, 3, 4, 5, 6, 7, 8],
  );
  const [conversionFactor, setConversionFactor] = useState(
    initialState?.conversionFactor ?? 1.0,
  );
  const [nebenkostenPercent, setNebenkostenPercent] = useState(
    initialState?.nebenkostenPercent ?? 5,
  );
  const [coordinationFactor, setCoordinationFactor] = useState(
    initialState?.coordinationFactor ?? 1.0,
  );

  const eligibleCosts = useMemo(
    () => parseGermanNumber(eligibleCostsStr),
    [eligibleCostsStr],
  );

  // Get phase percentages for the selected service type (from domain logic)
  const phasePercentages = useMemo(
    () => getPhasePercentages(serviceType),
    [serviceType],
  );

  // Calculate fee using the real HOAI domain logic
  const feeResult = useMemo(() => {
    if (eligibleCosts <= 0 || selectedPhases.length === 0) return null;
    try {
      // Clamp conversion factor to valid range for calculation
      const clampedConversion = Math.max(1.0, Math.min(1.33, conversionFactor));
      const clampedCoordination = Math.max(1.0, coordinationFactor);
      return calculateHoaiFee({
        serviceType,
        zone,
        eligibleCosts,
        phases: selectedPhases,
        conversionFactor: clampedConversion,
        nebenkostenPercent,
        coordinationFactor: clampedCoordination,
      });
    } catch {
      return null;
    }
  }, [serviceType, zone, eligibleCosts, selectedPhases, conversionFactor, nebenkostenPercent, coordinationFactor]);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.({
      serviceType,
      zone,
      eligibleCosts,
      selectedPhases,
      conversionFactor,
      nebenkostenPercent,
      coordinationFactor,
      feeResult,
    });
  }, [serviceType, zone, eligibleCosts, selectedPhases, conversionFactor, nebenkostenPercent, coordinationFactor, feeResult, onStateChange]);

  // When service type changes, update selected phases to only include valid ones
  useEffect(() => {
    const validPhases = phasePercentages.map((p) => p.phase);
    setSelectedPhases((prev) => {
      const filtered = prev.filter((p) => validPhases.includes(p as any));
      // If nothing is selected after filtering, select all valid phases except LP9
      if (filtered.length === 0) {
        return validPhases.filter((p) => p !== 9);
      }
      return filtered;
    });
  }, [phasePercentages]);

  const togglePhase = (nr: number) => {
    setSelectedPhases((prev) =>
      prev.includes(nr) ? prev.filter((n) => n !== nr) : [...prev, nr].sort((a, b) => a - b),
    );
  };

  // Phase-level fee breakdown using real HOAI data
  const phaseResults = useMemo(() => {
    return phasePercentages.map((phase) => {
      const isSelected = selectedPhases.includes(phase.phase);
      const breakdown = feeResult?.feeByPhase.find((b) => b.phase === phase.phase);
      return {
        nr: phase.phase,
        name: phase.name,
        percentage: phase.percentage,
        isSelected,
        feeMin: breakdown?.feeMin ?? 0,
        feeMax: breakdown?.feeMax ?? 0,
        feeMid: breakdown ? (breakdown.feeMin + breakdown.feeMax) / 2 : 0,
      };
    });
  }, [phasePercentages, selectedPhases, feeResult]);

  return (
    <div className="space-y-6">
      {/* Service Type & Zone */}
      <Card>
        <CardHeader>
          <CardTitle>HOAI Parameter</CardTitle>
          <CardDescription>
            Leistungsbild und Honorarzone festlegen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Leistungsbild</Label>
            <Select
              value={serviceType}
              onValueChange={(v) => setServiceType(v as HoaiServiceType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map((st) => (
                  <SelectItem key={st.value} value={st.value}>
                    {st.paragraph} {st.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Honorarzone</Label>
            <Select
              value={String(zone)}
              onValueChange={(v) => setZone(Number(v) as HoaiZone)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.value} value={String(z.value)}>
                    {z.label} &ndash; {z.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eligible-costs">
              Anrechenbare Kosten (netto)
            </Label>
            <div className="relative">
              <Input
                id="eligible-costs"
                value={eligibleCostsStr}
                onChange={(e) => setEligibleCostsStr(e.target.value)}
                className="pr-12"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                EUR
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conversion-factor">
              Umbauzuschlag (1,0 &ndash; 1,33)
            </Label>
            <div className="flex items-center gap-4">
              <input
                id="conversion-factor"
                type="range"
                min={1.0}
                max={1.33}
                step={0.01}
                value={conversionFactor}
                onChange={(e) => setConversionFactor(Number.parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="w-16 text-right text-sm font-medium">
                {conversionFactor.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Bei Umbauten und Modernisierungen bis zu 33% Zuschlag
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nebenkosten">Nebenkosten</Label>
            <div className="flex items-center gap-2">
              <Input
                id="nebenkosten"
                type="number"
                min={0}
                max={20}
                value={nebenkostenPercent}
                onChange={(e) => setNebenkostenPercent(Number.parseInt(e.target.value) || 0)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Selection & Calculation */}
      <Card>
        <CardHeader>
          <CardTitle>Leistungsphasen</CardTitle>
          <CardDescription>
            Leistungsphasen auswaehlen und Honorar berechnen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 text-left font-medium w-8" />
                  <th className="pb-2 text-left font-medium">Leistungsphase</th>
                  <th className="pb-2 text-right font-medium w-16">%</th>
                  <th className="pb-2 text-right font-medium w-32">Honorar (min)</th>
                  <th className="pb-2 text-right font-medium w-32">Honorar (max)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {phaseResults.map((phase) => (
                  <tr
                    key={phase.nr}
                    className={`transition-colors ${phase.isSelected ? '' : 'opacity-40'}`}
                  >
                    <td className="py-2">
                      <Checkbox
                        checked={phase.isSelected}
                        onCheckedChange={() => togglePhase(phase.nr)}
                      />
                    </td>
                    <td className="py-2">
                      <span className="font-medium">LP {phase.nr}</span>
                      <span className="ml-2 text-muted-foreground">{phase.name}</span>
                    </td>
                    <td className="py-2 text-right">{phase.percentage}%</td>
                    <td className="py-2 text-right">
                      {phase.isSelected ? formatCurrency(phase.feeMin) : '---'}
                    </td>
                    <td className="py-2 text-right">
                      {phase.isSelected ? formatCurrency(phase.feeMax) : '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="pt-3" />
                  <td className="pt-3">Summe ausgewaehlte Phasen</td>
                  <td className="pt-3 text-right">
                    {feeResult?.phasePercentageTotal ?? 0}%
                  </td>
                  <td className="pt-3 text-right">
                    {feeResult ? formatCurrency(feeResult.totalFeeMin) : '---'}
                  </td>
                  <td className="pt-3 text-right">
                    {feeResult ? formatCurrency(feeResult.totalFeeMax) : '---'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Result Summary */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle>Honoraruebersicht</CardTitle>
        </CardHeader>
        <CardContent>
          {feeResult ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Anrechenbare Kosten</span>
                <span className="font-medium">{formatCurrency(eligibleCosts)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Honorarzone {zone} &ndash;{' '}
                  {zones.find((z) => z.value === zone)?.description}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(feeResult.feeMin)} &ndash; {formatCurrency(feeResult.feeMax)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Honorar (gewaehlte Phasen)
                </span>
                <span className="font-medium">
                  {formatCurrency(feeResult.totalFeeMin)} &ndash; {formatCurrency(feeResult.totalFeeMax)}
                </span>
              </div>
              {conversionFactor !== 1.0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Umbauzuschlag ({conversionFactor.toFixed(2)})
                  </span>
                  <span className="font-medium">
                    {formatCurrency(feeResult.adjustedFeeMin)} &ndash; {formatCurrency(feeResult.adjustedFeeMax)}
                  </span>
                </div>
              )}
              {nebenkostenPercent > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Nebenkosten ({nebenkostenPercent}%)
                  </span>
                  <span className="font-medium">
                    {formatCurrency(feeResult.nebenkostenAmountMin)} &ndash; {formatCurrency(feeResult.nebenkostenAmountMax)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Gesamthonorar (netto)</span>
                <span className="text-primary">
                  {formatCurrency(feeResult.totalNetMin)} &ndash; {formatCurrency(feeResult.totalNetMax)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Mittelsatz (netto)</span>
                <span className="font-medium">
                  {formatCurrency((feeResult.totalNetMin + feeResult.totalNetMax) / 2)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>zzgl. 19% MwSt.</span>
                <span>
                  {formatCurrency(((feeResult.totalNetMin + feeResult.totalNetMax) / 2) * 0.19)}
                </span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span>Gesamthonorar (brutto, Mittelsatz)</span>
                <span>
                  {formatCurrency(((feeResult.totalNetMin + feeResult.totalNetMax) / 2) * 1.19)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Bitte geben Sie die anrechenbaren Kosten ein und waehlen Sie mindestens eine Leistungsphase.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
