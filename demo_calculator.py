# Calculator Demo Script
# Demonstrates all mathematical operations with test cases

def add(a, b):
    """Add two numbers"""
    return a + b

def subtract(a, b):
    """Subtract b from a"""
    return a - b

def multiply(a, b):
    """Multiply two numbers"""
    return a * b

def divide(a, b):
    """Divide a by b with zero check"""
    if b == 0:
        raise ValueError("Cannot divide by zero!")
    return a / b

def power(a, b):
    """Raise a to power b"""
    return a ** b

def modulo(a, b):
    """Get remainder of a divided by b"""
    if b == 0:
        raise ValueError("Cannot modulo by zero!")
    return a % b

# ============================================
# TEST SUITE - Run all test cases
# ============================================

print("=" * 50)
print(" CALCULATOR TEST SUITE")
print("=" * 50)
print()

# Test 1: Addition
print("TEST 1: Addition")
result = add(5, 3)
print(f"  5 + 3 = {result}")
assert result == 8, "Addition test failed!"
print("  [OK] PASSED")
print()

# Test 2: Subtraction
print("TEST 2: Subtraction")
result = subtract(10, 4)
print(f"  10 - 4 = {result}")
assert result == 6, "Subtraction test failed!"
print("  [OK] PASSED")
print()

# Test 3: Multiplication
print("TEST 3: Multiplication")
result = multiply(6, 7)
print(f"  6 * 7 = {result}")
assert result == 42, "Multiplication test failed!"
print("  [OK] PASSED")
print()

# Test 4: Division
print("TEST 4: Division")
result = divide(20, 5)
print(f"  20 / 5 = {result}")
assert result == 4, "Division test failed!"
print("  [OK] PASSED")
print()

# Test 5: Power
print("TEST 5: Power")
result = power(2, 10)
print(f"  2^10 = {result}")
assert result == 1024, "Power test failed!"
print("  [OK] PASSED")
print()

# Test 6: Modulo  
print("TEST 6: Modulo")
result = modulo(17, 5)
print(f"  17 % 5 = {result}")
assert result == 2, "Modulo test failed!"
print("  [OK] PASSED")
print()

# Test 7: Division by zero error handling
print("TEST 7: Division by Zero (Error Handling)")
try:
    divide(10, 0)
    print("  [FAIL] FAILED - Should have raised ValueError")
except ValueError as e:
    print(f"  Correctly caught error: {e}")
    print("  [OK] PASSED")
print()

# Test 8: Complex calculation
print("TEST 8: Complex Calculation")
result = (add(multiply(3, 4), power(2, 3)) - divide(16, 4))
print(f"  (3*4 + 2^3) - 16/4 = {result}")
assert result == 16, "Complex calculation failed!"
print("  [OK] PASSED")
print()

print("=" * 50)
print(" ALL TESTS PASSED!")
print("=" * 50)
