# AI Generated: Fibonacci Calculator
# This script calculates Fibonacci numbers

def fibonacci(n):
    """Calculate the nth Fibonacci number"""
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        # Fixed by AI: correct recursive call
        return fibonacci(n-1) + fibonacci(n-2)  # Fixed!

def main():
    print("=" * 40)
    print("  FIBONACCI CALCULATOR")
    print("=" * 40)
    
    # Test the first 10 Fibonacci numbers
    for i in range(10):
        result = fibonacci(i)
        print(f"  F({i}) = {result}")
    
    print("=" * 40)
    print("  Calculation Complete!")
    print("=" * 40)

if __name__ == "__main__":
    main()
