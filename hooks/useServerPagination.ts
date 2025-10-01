"use client"

import { useState, useCallback, useEffect } from 'react'

interface UseServerPaginationProps {
  initialPage?: number
  initialItemsPerPage?: number
  onPageChange?: (page: number, itemsPerPage: number) => void
}

interface PaginationState {
  currentPage: number
  itemsPerPage: number
  totalItems: number
  totalPages: number
  isLoading: boolean
}

interface PaginationActions {
  setCurrentPage: (page: number) => void
  setItemsPerPage: (itemsPerPage: number) => void
  setTotalItems: (totalItems: number) => void
  setIsLoading: (isLoading: boolean) => void
  reset: () => void
  goToPage: (page: number) => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
}

export function useServerPagination({
  initialPage = 1,
  initialItemsPerPage = 25,
  onPageChange
}: UseServerPaginationProps = {}): [PaginationState, PaginationActions] {
  const [currentPage, setCurrentPageState] = useState(initialPage)
  const [itemsPerPage, setItemsPerPageState] = useState(initialItemsPerPage)
  const [totalItems, setTotalItems] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  // Trigger callback when page or items per page changes
  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage, itemsPerPage)
    }
  }, [currentPage, itemsPerPage, onPageChange])

  const setCurrentPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPageState(validPage)
  }, [totalPages])

  const setItemsPerPage = useCallback((newItemsPerPage: number) => {
    setItemsPerPageState(newItemsPerPage)
    // Reset to first page when changing items per page
    setCurrentPageState(1)
  }, [])

  const reset = useCallback(() => {
    setCurrentPageState(initialPage)
    setItemsPerPageState(initialItemsPerPage)
    setTotalItems(0)
    setIsLoading(false)
  }, [initialPage, initialItemsPerPage])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page)
  }, [setCurrentPage])

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }, [currentPage, totalPages, setCurrentPage])

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }, [currentPage, setCurrentPage])

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1)
  }, [setCurrentPage])

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages)
  }, [totalPages, setCurrentPage])

  const state: PaginationState = {
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    isLoading
  }

  const actions: PaginationActions = {
    setCurrentPage,
    setItemsPerPage,
    setTotalItems,
    setIsLoading,
    reset,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage
  }

  return [state, actions]
}
