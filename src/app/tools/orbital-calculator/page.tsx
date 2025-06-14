"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { FaSatellite, FaClock, FaTachometerAlt } from "react-icons/fa";
import { calculateOrbitalProperties, OrbitalResult } from "./logic";
import { MtoMi, MitoM, KmtoM, MtoKm, MStoKMS } from "@/utils/conversions";
import Visualization, { OrbitalDetailPoint } from "./Visualization";
import Details from "./Details";
import Theory from "./Theory";
import Navigation from "../components/Navigation";

type AltitudeUnit = "km" | "mi";
type InputType = "altitude" | "distance";

// Earth radius in km - used for conversion between altitude and distance from center
const EARTH_RADIUS_KM = 6371;

// Helper to format seconds into HH:MM:SS or Days H:M:S
const formatPeriod = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "N/A";

  const days = Math.floor(seconds / (3600 * 24));
  seconds %= 3600 * 24;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;
  const secs = Math.round(seconds); // Round seconds

  let result = "";
  if (days > 0) {
    result += `${days}d `;
  }
  result += `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  if (days > 0) {
    result += " (H:M:S)";
  } else {
    result += " (HH:MM:SS)";
  }

  return result;
};

export default function OrbitalCalculatorPage() {
  // Input state
  const [inputValue, setInputValue] = useState<string>("400"); // Default LEO altitude
  const [altitudeUnit, setAltitudeUnit] = useState<AltitudeUnit>("km");
  const [inputType, setInputType] = useState<InputType>("altitude");

  // Results state
  const [results, setResults] = useState<OrbitalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [interactiveHoverPoint, setInteractiveHoverPoint] = useState<OrbitalDetailPoint | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const valueNum = parseFloat(inputValue);

    if (isNaN(valueNum)) {
      setError("Please enter a valid number for altitude.");
      return;
    }
    if (valueNum < 0) {
      setError("Altitude must be a non-negative value.");
      return;
    }

    try {
      let altitudeKm: number;

      if (inputType === "altitude") {
        // Input is altitude
        altitudeKm = altitudeUnit === "mi" ? MtoKm(MitoM(valueNum)) : valueNum;
      } else {
        // Input is distance from center
        const distanceKm = altitudeUnit === "mi" ? MtoKm(MitoM(valueNum)) : valueNum;
        altitudeKm = distanceKm - EARTH_RADIUS_KM;

        // Basic validation for distance input
        if (distanceKm < EARTH_RADIUS_KM) {
          setError(`Distance from center cannot be less than Earth's radius (${EARTH_RADIUS_KM} km).`);
          setResults(null);
          return;
        }
      }

      const calculatedResults = calculateOrbitalProperties(altitudeKm);
      setResults(calculatedResults);
    } catch (err) {
      if (err instanceof Error) {
        // Catch specific errors from logic if needed, e.g., altitude too low
        setError(err.message);
      } else {
        setError("An unknown error occurred during calculation.");
      }
      setResults(null);
    }
  }, [inputValue, altitudeUnit, inputType]);

  // Calculate whenever input values or unit changes
  useEffect(() => {
    handleCalculate();
  }, [handleCalculate]);

  // Format results for display
  const formattedResults = useMemo(() => {
    if (!results) return null;
    return {
      altitudeKm: results.altitudeKm.toFixed(1),
      altitudeMi: MtoMi(KmtoM(results.altitudeKm)).toFixed(1),
      velocityMs: results.velocityMs.toFixed(2),
      velocityKms: MStoKMS(results.velocityMs).toFixed(3),
      velocityMiS: MtoMi(results.velocityMs).toFixed(3),
      periodS: results.periodS.toFixed(0),
      periodFormatted: formatPeriod(results.periodS),
    };
  }, [results]);

  const getInputPlaceholder = () => {
    if (inputType === "altitude") {
      return altitudeUnit === "km" ? "e.g., 400 (LEO)" : "e.g., 249 (LEO)";
    } else {
      // Distance from center placeholders
      return altitudeUnit === "km" ? "e.g., 6771 (LEO)" : "e.g., 4208 (LEO)";
    }
  };

  const getInputLabel = () => {
    return inputType === "altitude" ? "Altitude Above Surface" : "Distance from Center";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCalculate();
    }
  };

  // Function to convert input value when type changes
  const handleInputTypeChange = (newType: InputType) => {
    if (newType === inputType) return; // No change

    const currentValue = parseFloat(inputValue);
    if (isNaN(currentValue)) {
      setInputType(newType);
      setError(null); // Clear potential previous error
      return; // Don't convert if input is not a number
    }

    let convertedValue: number;
    const valueInKm = altitudeUnit === "mi" ? MtoKm(MitoM(currentValue)) : currentValue;

    if (newType === "distance" && inputType === "altitude") {
      // Convert from altitude to distance
      convertedValue = valueInKm + EARTH_RADIUS_KM;
    } else if (newType === "altitude" && inputType === "distance") {
      // Convert from distance to altitude
      convertedValue = Math.max(0, valueInKm - EARTH_RADIUS_KM); // Ensure altitude isn't negative
    } else {
      convertedValue = valueInKm; // Should not happen, but fallback
    }

    // Convert back to the selected unit if needed
    const displayValue = (altitudeUnit === "mi" ? MtoMi(KmtoM(convertedValue)) : convertedValue).toFixed(1); // Keep one decimal place for consistency

    setInputType(newType);
    setInputValue(displayValue);
    setError(null); // Clear error after successful conversion
    // Recalculation will happen via useEffect dependency change
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
        Orbital Calculator (Earth)
      </h1>

      <Navigation
        name="Orbital Calculator"
        description="Calculate orbital velocity and period for a circular orbit around Earth based on altitude above the surface."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Column 1: Inputs and Results */}
        <div className="flex flex-col gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-600 dark:text-gray-300">
            Calculate orbital velocity and period for a circular orbit around Earth. Input either altitude above surface
            or distance from Earth&apos;s center. Assumes a spherical Earth ({EARTH_RADIUS_KM} km radius) and neglects
            atmospheric drag.
          </p>

          {/* Input Type Selector Buttons */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleInputTypeChange("altitude")}
              className={`group relative inline-flex w-full items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-800 ${
                inputType === "altitude"
                  ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              } `}
            >
              Altitude Above Surface
            </button>
            <button
              type="button"
              onClick={() => handleInputTypeChange("distance")}
              className={`group relative inline-flex w-full items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-800 ${
                inputType === "distance"
                  ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              } `}
            >
              Distance from Center
            </button>
          </div>

          {/* Input Value and Unit & Button */}
          <div className="mb-6 flex flex-row gap-4">
            {/* Altitude Input - Takes 1 span */}
            <div className="flex-1">
              <label htmlFor="input-value" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                {getInputLabel()}
              </label>
              <input
                type="number"
                id="input-value"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getInputPlaceholder()}
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            {/* Unit Selector - Takes 1 span */}
            <div className="flex-1">
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Unit
              </label>
              <select
                id="unit"
                value={altitudeUnit}
                onChange={(e) => setAltitudeUnit(e.target.value as AltitudeUnit)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="km">Kilometers (km)</option>
                <option value="mi">Miles (mi)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-100 p-4 dark:bg-red-900/30">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                <span className="font-bold">Error:</span> {error}
              </p>
            </div>
          )}

          {formattedResults && !error && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Results:</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Input Altitude Display */}
                <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-600">
                  <FaSatellite className="mt-1 h-6 w-6 shrink-0 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-100">Altitude</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {formattedResults.altitudeKm} km / {formattedResults.altitudeMi} mi
                    </div>
                  </div>
                </div>
                {/* Orbital Velocity Display */}
                <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-600">
                  <FaTachometerAlt className="mt-1 h-6 w-6 shrink-0 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-100">Orbital Velocity</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {formattedResults.velocityKms} km/s / {formattedResults.velocityMiS} mi/s
                      <span className="ml-2 text-xs text-gray-500">({formattedResults.velocityMs} m/s)</span>
                    </div>
                  </div>
                </div>
                {/* Orbital Period Display */}
                <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-600">
                  <FaClock className="mt-1 h-6 w-6 shrink-0 text-purple-500" />
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-100">Orbital Period</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {formattedResults.periodFormatted}
                      <span className="ml-2 text-xs text-gray-500">({formattedResults.periodS} s)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Visualization and Details */}
        <div className="flex flex-col gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <Visualization orbitalResult={results} onHoverPoint={setInteractiveHoverPoint} height={400} />
          <Details detailPoint={interactiveHoverPoint} />
        </div>
      </div>

      {/* Theory/Notes Section */}
      <Theory />
    </div>
  );
}
