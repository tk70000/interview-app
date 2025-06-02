import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { AvailableDate, InterviewAvailability } from "@/types"

interface InterviewSchedulerModalProps {
  candidateId: string
  candidateEmail: string
  candidateName: string
  onSubmit: (data: InterviewAvailability) => Promise<void>
}

export function InterviewSchedulerModal({
  candidateId,
  candidateEmail,
  candidateName,
  onSubmit
}: InterviewSchedulerModalProps) {
  const [selectedDates, setSelectedDates] = useState<AvailableDate[]>([])
  const [phoneNumber, setPhoneNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 選択可能な日付を生成（1~2週間先）
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i + 1)
    return date.toISOString().split("T")[0]
  })

  const handleDateSelect = (date: string, timePreference: "morning" | "afternoon" | "full-day") => {
    setSelectedDates(prev => {
      const exists = prev.findIndex(d => d.date === date)
      if (exists >= 0) {
        const newDates = [...prev]
        newDates[exists] = { date, timePreference }
        return newDates
      }
      return [...prev, { date, timePreference }]
    })
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      await onSubmit({
        candidateId,
        candidateEmail,
        candidateName,
        availableDates: selectedDates,
        phoneNumber,
        additionalNotes: notes,
        submittedAt: new Date()
      })
      setIsOpen(false)
    } catch (error) {
      console.error("Failed to submit interview availability:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>キャリアアドバイザーに相談</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>面接希望日程の選択</DialogTitle>
          <DialogDescription>
            1〜2週間先の面接可能日を選択してください。複数の日程を選択できます。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {availableDates.map(date => (
            <div key={date} className="grid grid-cols-2 items-center gap-4">
              <Label>{date}</Label>
              <Select
                onValueChange={(value: "morning" | "afternoon" | "full-day") => 
                  handleDateSelect(date, value)
                }
                value={selectedDates.find(d => d.date === date)?.timePreference}
              >
                <SelectTrigger>
                  <SelectValue placeholder="時間帯を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">午前</SelectItem>
                  <SelectItem value="afternoon">午後</SelectItem>
                  <SelectItem value="full-day">終日</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
          <div className="grid grid-cols-2 items-center gap-4">
            <Label htmlFor="phone">電話番号</Label>
            <Input
              id="phone"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="090-1234-5678"
            />
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <Label htmlFor="notes">備考</Label>
            <Input
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="備考事項があればご記入ください"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={selectedDates.length === 0 || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "送信中..." : "送信"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}