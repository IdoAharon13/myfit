echo "Starting MyFit Standalone Java Server..."
cd "$(dirname "$0")"

# Check Java version
JAVA_VER=$(java -version 2>&1 | head -n 1 | cut -d '"' -f 2 | cut -d '.' -f 1)
if [ "$JAVA_VER" -lt 11 ] && [ "$JAVA_VER" != "1" ]; then
    echo "ERROR: Java 11 or higher is required. Found version: $JAVA_VER"
    exit 1
fi

mkdir -p data
echo "----------------------------------------"
echo "Starting server... KEEP THIS WINDOW OPEN!"
echo "----------------------------------------"
java MyFitServer.java
