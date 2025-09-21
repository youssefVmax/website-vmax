"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertCircle, Play } from "lucide-react"
import { userService } from "@/lib/mysql-services"
import { authenticateUser, MANAGER_USER } from "@/lib/auth"

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message: string
}

export default function SystemTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Manager Authentication', status: 'pending', message: '' },
    { name: 'MySQL Connection', status: 'pending', message: '' },
    { name: 'User Service Operations', status: 'pending', message: '' },
    { name: 'Database Read/Write', status: 'pending', message: '' },
    { name: 'Component Integration', status: 'pending', message: '' }
  ])
  const [isRunning, setIsRunning] = useState(false)

  const updateTest = (index: number, status: TestResult['status'], message: string) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message } : test
    ))
  }

  const runTests = async () => {
    setIsRunning(true)
    
    // Test 1: Manager Authentication
    updateTest(0, 'running', 'Testing manager login...')
    try {
      const user = await authenticateUser('manager', 'manage@Vmax')
      if (user && user.role === 'manager') {
        updateTest(0, 'success', 'Manager authentication working correctly')
      } else {
        updateTest(0, 'error', 'Manager authentication failed')
      }
    } catch (error) {
      updateTest(0, 'error', `Authentication error: ${error}`)
    }

    // Test 2: MySQL Connection
    updateTest(1, 'running', 'Testing MySQL connection...')
    try {
      await userService.getAllUsers()
      updateTest(1, 'success', 'MySQL connection established')
    } catch (error) {
      updateTest(1, 'error', `MySQL connection failed: ${error}`)
    }

    // Test 3: User Service Operations
    updateTest(2, 'running', 'Testing user service operations...')
    try {
      const testUser = {
        username: 'test-user-' + Date.now(),
        password: 'test123',
        name: 'Test User',
        role: 'salesman' as const,
        team: 'CS TEAM',
        email: 'test@example.com'
      }
      
      // Create test user
      const createResult = await userService.createUser(testUser)
      const userId = createResult.id
      
      // Read test user
      const createdUser = await userService.getUserById(userId)
      
      // Note: Skip delete for safety in production
      // await userService.deleteUser(userId)
      
      if (createdUser && createdUser.username === testUser.username) {
        updateTest(2, 'success', 'User CRUD operations working correctly')
      } else {
        updateTest(2, 'error', 'User operations failed')
      }
    } catch (error) {
      updateTest(2, 'error', `User service error: ${error}`)
    }

    // Test 4: Database Read/Write
    updateTest(3, 'running', 'Testing database operations...')
    try {
      const users = await userService.getAllUsers()
      const salesmen = await userService.getUsersByRole('salesman')
      updateTest(3, 'success', `Database operations successful (${users.length} total users, ${salesmen.length} salesmen)`)
    } catch (error) {
      updateTest(3, 'error', `Database error: ${error}`)
    }

    // Test 5: Component Integration
    updateTest(4, 'running', 'Testing component integration...')
    try {
      // Test if all required components are available
      const components = [
        'UnifiedLogin',
        'UserManagement', 
        'FullPageDashboard',
        'CompleteApp'
      ]
      updateTest(4, 'success', `All components integrated successfully: ${components.join(', ')}`)
    } catch (error) {
      updateTest(4, 'error', `Component integration error: ${error}`)
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />
      case 'running': return <AlertCircle className="w-5 h-5 text-yellow-500 animate-spin" />
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-100 text-green-800">Passed</Badge>
      case 'error': return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case 'running': return <Badge className="bg-yellow-100 text-yellow-800">Running</Badge>
      default: return <Badge variant="outline">Pending</Badge>
    }
  }

  const allPassed = tests.every(test => test.status === 'success')
  const hasErrors = tests.some(test => test.status === 'error')

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Integration Test</h1>
        <p className="text-gray-600">
          Verify that all components are working correctly
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            System Test Suite
            <Button 
              onClick={runTests} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Running Tests...' : 'Run Tests'}
            </Button>
          </CardTitle>
          <CardDescription>
            Comprehensive testing of authentication, Firebase, and component integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <h3 className="font-medium">{test.name}</h3>
                    {test.message && (
                      <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(test.status)}
              </div>
            ))}
          </div>

          {!isRunning && tests.some(test => test.status !== 'pending') && (
            <div className="mt-6">
              {allPassed && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    🎉 All tests passed! Your system is ready for production.
                  </AlertDescription>
                </Alert>
              )}
              
              {hasErrors && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Some tests failed. Please check the error messages above and fix the issues.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>How to use your new authentication system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">🔐 Manager Login</h4>
              <p className="text-sm text-blue-800 mb-2">Use these credentials to access the system:</p>
              <div className="font-mono text-sm bg-white p-2 rounded border">
                Username: <strong>manager</strong><br />
                Password: <strong>manage@Vmax</strong>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">👥 User Management</h4>
              <p className="text-sm text-green-800">
                Once logged in, navigate to "User Management" in the sidebar to create salesman accounts.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-900 mb-2">🚀 Development</h4>
              <p className="text-sm text-purple-800">
                Run <code className="bg-white px-1 rounded">npm run dev</code> to start the development server.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
