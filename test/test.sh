
TEST_DEP_SRC="./test/dependencies.ts"
TEST_DEP_DEST="./test/dependencies.js"

# build test dependency file
# echo "Compiling Test dependency file"
# echo "Building $TEST_DEP_DEST" 
# if [ ! -f "$TEST_DEP_DEST" ] || [ "$TEST_DEP_SRC" -nt "$TEST_DEP_DEST" ] ; then
	tsc --out "$TEST_DEP_DEST" "$TEST_DEP_SRC"
# else
# 	echo "-- Compilation not necessary"
# fi

echo "Run 'test.html' in the browser"
