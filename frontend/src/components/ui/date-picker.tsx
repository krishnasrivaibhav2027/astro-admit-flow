import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

interface DatePickerProps extends Omit<CalendarProps, "mode" | "selected" | "onSelect" | "className"> {
    date?: Date
    setDate: (date?: Date) => void
    disabled?: boolean
    className?: string
    placeholder?: string
}

export function DatePicker({ date, setDate, disabled, className, placeholder = "Pick a date", ...calendarProps }: DatePickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                        disabled && "opacity-50 cursor-not-allowed",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                    }
                    {...calendarProps}
                />
            </PopoverContent>
        </Popover>
    )
}
