"use client"

import React, { useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChevronLeft, Trash2, Edit, Menu, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import html2canvas from 'html2canvas'

interface RetryConfig {
  type: 'linear' | 'exponential' | 'capped-exponential'
  initialDelay: number
  factor: number
  maxDuration?: number
  jitter: boolean
  jitterRange: number
}

const calculateRetryDurations = (config: RetryConfig, maxRetries: number): number[] => {
  const durations: number[] = [config.initialDelay]
  let currentDelay = config.initialDelay

  for (let i = 1; i < maxRetries; i++) {
    if (config.type === 'linear') {
      currentDelay += config.factor
    } else if (config.type === 'exponential' || config.type === 'capped-exponential') {
      currentDelay *= config.factor
      if (config.type === 'capped-exponential' && config.maxDuration) {
        currentDelay = Math.min(currentDelay, config.maxDuration)
      }
    }

    if (config.jitter) {
      const jitter = (Math.random() * 2 - 1) * config.jitterRange
      currentDelay = Math.max(0, currentDelay + jitter)
    }

    durations.push(durations[i - 1] + currentDelay)
  }

  return durations
}

const formatTime = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(2)}ms`
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(2)}s`
  } else if (milliseconds < 3600000) {
    return `${(milliseconds / 60000).toFixed(2)}m`
  } else {
    return `${(milliseconds / 3600000).toFixed(2)}h`
  }
}

const RetryAlgorithmComparison: React.FC = () => {
  const [configs, setConfigs] = useState<RetryConfig[]>([])
  const [newConfig, setNewConfig] = useState<RetryConfig>({
    type: 'linear',
    initialDelay: 1000,
    factor: 1000,
    jitter: false,
    jitterRange: 3,
  })
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [globalMaxRetries, setGlobalMaxRetries] = useState(5)
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(true)
  const chartRef = useRef<HTMLDivElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setNewConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? Number(value) : value
    }))
  }

  const handleJitterChange = (checked: boolean) => {
    setNewConfig(prev => ({ ...prev, jitter: checked }))
  }

  const handleAddConfig = () => {
    setConfigs(prev => [...prev, newConfig])
    setNewConfig({
      type: 'linear',
      initialDelay: 1000,
      factor: 1000,
      jitter: false,
      jitterRange: 3,
    })
    setIsEditDialogOpen(false)
  }

  const handleEditConfig = (index: number) => {
    setEditingIndex(index)
    setNewConfig(configs[index])
    setIsEditDialogOpen(true)
  }

  const handleUpdateConfig = () => {
    if (editingIndex !== null) {
      setConfigs(prev => {
        const updated = [...prev]
        updated[editingIndex] = newConfig
        return updated
      })
      setEditingIndex(null)
      setIsEditDialogOpen(false)
      setNewConfig({
        type: 'linear',
        initialDelay: 1000,
        factor: 1000,
        jitter: false,
        jitterRange: 3,
      })
    }
  }

  const handleDeleteConfig = (index: number) => {
    setConfigs(prev => prev.filter((_, i) => i !== index))
  }

  const chartData = useMemo(() => {
    const data: { retryCount: number, [key: string]: number }[] = []

    for (let i = 0; i <= globalMaxRetries; i++) {
      const point: { retryCount: number, [key: string]: number } = { retryCount: i }
      configs.forEach((config, index) => {
        const durations = calculateRetryDurations(config, globalMaxRetries)
        point[`Config ${index + 1}`] = i === 0 ? 0 : durations[i - 1]
      })
      data.push(point)
    }

    return data
  }, [configs, globalMaxRetries])

  const handleExport = async () => {
    const exportContainer = document.createElement('div');
    exportContainer.style.padding = '20px';
    exportContainer.style.backgroundColor = 'white';
    
    const tableClone = document.querySelector('table')?.cloneNode(true) as HTMLElement;
    if (tableClone) {
      tableClone.style.marginBottom = '20px';
      exportContainer.appendChild(tableClone);
    }
    
    if (chartRef.current) {
      exportContainer.appendChild(chartRef.current.cloneNode(true));
    }
    
    document.body.appendChild(exportContainer);
    
    const canvas = await html2canvas(exportContainer);
    const image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    const link = document.createElement('a');
    link.download = 'retry-algorithm-comparison.png';
    link.href = image;
    link.click();
    
    document.body.removeChild(exportContainer);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      <div className="flex lg:flex-col items-center justify-between lg:justify-start p-4 lg:py-4 bg-gray-100 border-b lg:border-r border-gray-200">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
          className="lg:mb-4"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">{isDescriptionOpen ? 'Close' : 'Open'} description</span>
        </Button>
        {!isDescriptionOpen && (
          <a href="https://getconvoy.io/?utm_source=compareretries" target="_blank" rel="noopener noreferrer" className="lg:mt-auto">
            <img src="https://getconvoy.io/svg/convoy-logo-new.svg" alt="Convoy" className="w-6 h-6" />
          </a>
        )}
      </div>
      <div
        className={`
          transition-all duration-300 ease-in-out overflow-hidden
          ${isDescriptionOpen ? 'h-[300px] lg:h-auto lg:w-[30%] lg:min-w-[250px]' : 'h-0 lg:w-0'}
        `}
      >
        {isDescriptionOpen && (
          <div className="p-4 h-full flex flex-col">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Retry Algorithm Comparison</h2>
              <p className="text-sm text-muted-foreground">
                Compare linear, exponential, and capped exponential backoff strategies with configurable jitter
              </p>
            </div>

            <Card className="flex-grow overflow-hidden flex flex-col">
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <div>
                  <h3 className="font-semibold">What are Retry Algorithms?</h3>
                  <p className="text-sm text-muted-foreground">
                    A retry algorithm determines how long to wait between repeated attempts to perform an action that has failed.
                    Different strategies offer various trade-offs between aggressive retries and avoiding system overload.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">Available Strategies</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                    <li>
                      <span className="font-medium">Linear Retry:</span> Increases wait time by a fixed amount each retry
                    </li>
                    <li>
                      <span className="font-medium">Exponential Backoff:</span> Doubles (or multiplies) wait time each retry
                    </li>
                    <li>
                      <span className="font-medium">Capped Exponential:</span> Like exponential but with a maximum delay
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold">Jitter</h3>
                  <p className="text-sm text-muted-foreground">
                    Adding randomness to retry delays helps prevent thundering herd problems when multiple clients are retrying simultaneously.
                  </p>
                </div>
              </CardContent>
              <div className="mt-4 hidden lg:flex flex-col items-center justify-center space-y-2">
                <span className="text-sm text-muted-foreground">Built By</span>
                <a href="https://getconvoy.io/?utm_source=compareretries" target="_blank" rel="noopener noreferrer">
                  <img src="https://getconvoy.io/svg/convoy-logo-full-new.svg" alt="Convoy" className="h-6" />
                </a>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-4 lg:p-6">
          <div className="mb-6">
            <Label htmlFor="globalMaxRetries">Max Retries: {globalMaxRetries}</Label>
            <Slider
              id="globalMaxRetries"
              min={1}
              max={20}
              step={1}
              value={[globalMaxRetries]}
              onValueChange={(value) => setGlobalMaxRetries(value[0])}
              className="mt-2"
            />
          </div>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mb-4 w-full lg:w-auto">Add New Configuration</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingIndex !== null ? 'Edit Configuration' : 'Add New Configuration'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { 
                e.preventDefault()
                editingIndex !== null ? handleUpdateConfig() : handleAddConfig()
              }} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Algorithm Type</Label>
                    <select
                      id="type"
                      name="type"
                      value={newConfig.type}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="linear">Linear</option>
                      <option value="exponential">Exponential</option>
                      <option value="capped-exponential">Capped Exponential</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="initialDelay">Initial Delay (ms)</Label>
                    <Input
                      id="initialDelay"
                      name="initialDelay"
                      type="number"
                      value={newConfig.initialDelay}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="factor">Factor (ms for linear, multiplier for exponential)</Label>
                    <Input
                      id="factor"
                      name="factor"
                      type="number"
                      value={newConfig.factor}
                      onChange={handleInputChange}
                    />
                  </div>
                  {newConfig.type === 'capped-exponential' && (
                    <div>
                      <Label htmlFor="maxDuration">Max Duration (ms)</Label>
                      <Input
                        id="maxDuration"
                        name="maxDuration"
                        type="number"
                        value={newConfig.maxDuration || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="jitter"
                      checked={newConfig.jitter}
                      onCheckedChange={handleJitterChange}
                    />
                    <Label htmlFor="jitter">Apply Jitter</Label>
                  </div>
                  {newConfig.jitter && (
                    <div>
                      <Label htmlFor="jitterRange">Jitter Range (ms)</Label>
                      <Input
                        id="jitterRange"
                        name="jitterRange"
                        type="number"
                        value={newConfig.jitterRange}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full">{editingIndex !== null ? 'Update' : 'Add'} Configuration</Button>
              </form>
            </DialogContent>
          </Dialog>

          <div className="overflow-x-auto">
            <Table className="mb-6">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Config #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Initial Delay</TableHead>
                  <TableHead>Factor</TableHead>
                  <TableHead>Max Duration</TableHead>
                  <TableHead>Jitter</TableHead>
                  <TableHead>Jitter Range</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{config.type}</TableCell>
                    <TableCell>{config.initialDelay}</TableCell>
                    <TableCell>{config.factor}</TableCell>
                    <TableCell>{config.maxDuration || 'N/A'}</TableCell>
                    <TableCell>{config.jitter ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{config.jitter ? `±${config.jitterRange}ms` : 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditConfig(index)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit configuration {index + 1}</span>
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDeleteConfig(index)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete configuration {index + 1}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="h-[300px] lg:h-[400px]" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="retryCount" 
                  type="number"
                  domain={[0, globalMaxRetries]}
                  tickFormatter={(value) => `${value}`}
                  label={{ value: "Number of Retries", position: "bottom", offset: 0 }}
                />
                <YAxis 
                  tickFormatter={(value) => formatTime(value)}
                  width={80}
                />
                <Tooltip 
                  formatter={(value: number) => formatTime(value)}
                  labelFormatter={(label: number) => `Retry Count: ${label}`}
                />
                <Legend 
                  verticalAlign="top"
                  align="center"
                  layout="horizontal"
                  margin={{ top: 0, left: 0, right: 0, bottom: 10 }}
                />
                {configs.map((_, index) => (
                  <Line
                    key={index}
                    type="monotone"
                    dataKey={`Config ${index + 1}`}
                    stroke={`hsl(${index * 137.5 % 360}, 70%, 50%)`}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleExport} className="w-full lg:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Export Chart and Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="mt-4 flex flex-col items-center justify-center space-y-2 lg:hidden">
        <span className="text-sm text-muted-foreground">Built By</span>
        <a href="https://getconvoy.io/?utm_source=compareretries" target="_blank" rel="noopener noreferrer">
          <img src="https://getconvoy.io/svg/convoy-logo-full-new.svg" alt="Convoy" className="h-6" />
        </a>
      </div>
    </div>
  )
}

export default RetryAlgorithmComparison
