"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ComboboxProps {
  options: string[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  allowCustom?: boolean
  className?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search options...",
  allowCustom = true,
  className
}: ComboboxProps) {
  const [isCustom, setIsCustom] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  React.useEffect(() => {
    if (value && !options.includes(value)) {
      setIsCustom(true)
      setInputValue(value)
    } else {
      setIsCustom(false)
      setInputValue("")
    }
  }, [value, options])

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === "custom") {
      setIsCustom(true)
      setInputValue("")
    } else {
      setIsCustom(false)
      onValueChange(selectedValue)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onValueChange(newValue)
  }

  if (isCustom) {
    return (
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={className}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCustom(false)}
        >
          Select
        </Button>
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={handleSelectChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
        {allowCustom && (
          <SelectItem value="custom">
            <span className="text-muted-foreground">+ Add custom value</span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}
