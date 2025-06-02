'use client'

import { useState } from 'react'
import { format, addDays, startOfDay, isWeekend } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Calendar } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'

interface InterviewSchedulerModalProps {
  isOpen: boolean
  onClose: () => void
  candidateName: string
  candidateEmail: string
  sessionId: string
}

interface AvailableDate {
  date: string
  timePreference: 'morning' | 'afternoon' | 'full-day'
}

export function InterviewSchedulerModal({
  isOpen,
  onClose,
  candidateName,
  candidateEmail,
  sessionId,
}: InterviewSchedulerModalProps) {
  const [selectedDates, setSelectedDates] = useState<AvailableDate[]>([])
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // 1〜2週間先の日付を生成（土日を除く）
  const generateAvailableDates = () => {
    const dates = []
    const startDate = addDays(new Date(), 7) // 1週間後から
    const endDate = addDays(new Date(), 14) // 2週間後まで

    let currentDate = startDate
    while (currentDate <= endDate) {
      if (!isWeekend(currentDate)) {
        dates.push(startOfDay(currentDate))
      }
      currentDate = addDays(currentDate, 1)
    }
    return dates
  }

  const availableDates = generateAvailableDates()

  const handleDateToggle = (date: Date, timePreference: 'morning' | 'afternoon' | 'full-day') => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const existingIndex = selectedDates.findIndex(
      d => d.date === dateStr && d.timePreference === timePreference
    )

    if (existingIndex >= 0) {
      setSelectedDates(selectedDates.filter((_, index) => index !== existingIndex))
    } else {
      setSelectedDates([...selectedDates, { date: dateStr, timePreference }])
    }
  }

  const isDateSelected = (date: Date, timePreference: 'morning' | 'afternoon' | 'full-day') => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return selectedDates.some(d => d.date === dateStr && d.timePreference === timePreference)
  }

  const handleSubmit = async () => {
    if (selectedDates.length === 0) {
      setError('少なくとも1つの面接可能日を選択してください')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/v1/interview-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          candidateName,
          candidateEmail,
          availableDates: selectedDates,
          additionalNotes,
        }),
      })

      if (!response.ok) {
        throw new Error('送信に失敗しました')
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      setError('送信中にエラーが発生しました。もう一度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>面接可能日の選択</DialogTitle>
          <DialogDescription>
            1〜2週間先の面接可能な日時を選択してください。複数選択可能です。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {success ? (
            <Alert>
              <AlertDescription>
                面接可能日を送信しました。キャリアアドバイザーから連絡があるまでお待ちください。
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-4">
                <Label>面接可能日時（平日のみ）</Label>
                <div className="space-y-3">
                  {availableDates.map((date) => (
                    <div key={date.toISOString()} className="border rounded-lg p-4">
                      <div className="font-medium mb-2">
                        {format(date, 'M月d日(E)', { locale: ja })}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={isDateSelected(date, 'morning')}
                            onCheckedChange={() => handleDateToggle(date, 'morning')}
                          />
                          <span className="text-sm">午前</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={isDateSelected(date, 'afternoon')}
                            onCheckedChange={() => handleDateToggle(date, 'afternoon')}
                          />
                          <span className="text-sm">午後</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={isDateSelected(date, 'full-day')}
                            onCheckedChange={() => handleDateToggle(date, 'full-day')}
                          />
                          <span className="text-sm">終日</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">備考（任意）</Label>
                <Textarea
                  id="notes"
                  placeholder="希望時間帯や連絡方法など、追加の情報があれば記入してください"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              <Calendar className="mr-2 h-4 w-4" />
              {isSubmitting ? '送信中...' : '送信する'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}