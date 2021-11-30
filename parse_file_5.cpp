#include <string>
#include <streambuf>
#include <sstream>
#include <iostream>
//#includes for local C++ testing:
#include <fstream>

//WIP for 5-19-2018: Execution of multiple input files.
//Files are serialized with "Master" NC files being placed first and subprograms placed last.
//NC program locations will have an "executed" flag to indicate that they have been run.
//Upon termination, next NC program will be run until the first executed flag is reached.

int oLocation[40][3] = { };//Location of each NC program in file. Name, Location, Has Executed (5-19-2018).
int oLocationIndex = 0; //Up to 40 Programs.
int subLocation[40][3];//Information on Subroutines. Goto address, Return address, Loops.
int subIndex = 0;//Up to 40 nested subs.

//Register.
double aNumber = 0;
double gNumber[12];//Array of G values.
double iNumber = 0;
double jNumber = 0;
double kNumber = 0;
int    lNumber = 1;//Current L value.
int    mNumber = -1;//Current M value.
int    oNumber = 0;//Current Program number.
int    pNumber = 0;//Current P value.
double rNumber = 0;
double xNumber = 0;
double yNumber = 0;
double zNumber = 0;

void init_gNum(){//Resets gNumber array.
	int count = 11;
	while(count--){
		gNumber[count] = -1;
	}
}

size_t flowControl(const std::string& everything, size_t pCounter) {//By reference for speed.
	if (mNumber == 30) {//End of program.
		mNumber = -1;//Reset.
		//Added 5-19-2018. Run next program if it was not a sub program.
		for (int fLcount = 0; fLcount < 40; fLcount++) {//Find location of next unexecuted program.
			if (oLocation[fLcount][1] > pCounter && oLocation[fLcount][2] == 0) {
				oLocation[fLcount][2] = 1;//Mark program as being executed.
				return oLocation[fLcount][1];
			}
		}
		return std::string::npos;
	}
	if (mNumber == 99) {
		mNumber = -1;//Reset.
		std::cout << "subIndex: " << subIndex << " 0: " << subLocation[subIndex - 1][0] << " 1: " << subLocation[subIndex - 1][1] << " 2: " << subLocation[subIndex - 1][2] << '\n';
		if (subIndex > 0) {
			subLocation[subIndex - 1][2]--;//One less loop.
			if (subLocation[subIndex - 1][2] > 0) {//If we have more loops to execute.
				return subLocation[subIndex - 1][0];
			}
			else //no more loops.
			{
				subIndex--;
				return subLocation[subIndex][1];//subIndex was decremented, so -1 is not needed.
			}
		}
		else
		{
			return std::string::npos;//Program should end. (Loop back to beginning).
		}
	}
	if (mNumber == 98) {
		mNumber = -1;//Reset.
		for (int fLcount = 0; fLcount < 40; fLcount++) {//Find Location of this program.
			if (oLocation[fLcount][0] == pNumber) {
				subLocation[subIndex][0] = oLocation[fLcount][1];//Where we are going.
				subLocation[subIndex][1] = pCounter;//Where we are now.
				subLocation[subIndex][2] = lNumber;//How many times we loop.
				subIndex++;//Increment the index.
				lNumber = 1;
				oLocation[fLcount][2] = 1;//Mark program as being executed. (5-19-2018)
				return oLocation[fLcount][1];
			}
		}
	}
	if (mNumber == 97) {//Subroutine
		mNumber = -1;//Zero is for program stop. -1 is for empty.
		int pStart = 0;
		int pIndex = 0;
		int pEnd = everything.length();
		std::string nString = "N" + std::to_string(pNumber);//Make search term from P callout.
		for (int fCcount = 0; fCcount < 40; fCcount++) {//Find Start of this program.
			if (oLocation[fCcount][0] == oNumber) {
				pStart = oLocation[fCcount][1];
				pIndex = fCcount;
				fCcount = 40;
			}
		}
		for (int fCcount = pIndex + 1; fCcount < 40; fCcount++) {//Find End of this program.
			if (oLocation[fCcount][1] > pStart) {
				pEnd = oLocation[fCcount][1];
				fCcount = 40;
			}
		}
		int nLocation = everything.find(nString, pStart);
		if (nLocation <= pEnd) {
			subLocation[subIndex][0] = nLocation;//Where we are going.
			subLocation[subIndex][1] = pCounter;//Where we are now.
			subLocation[subIndex][2] = lNumber;//How many times we loop.
			subIndex++;//Increment the index.
			lNumber = 1;//Reset lNumber.
			std::cout << "Name: " << everything.substr(nLocation, 3) << " nLocation: " << nLocation << '\n';
			std::cout << nLocation << " " << pCounter << " " << lNumber << '\n';
			return nLocation;//Return new address.
		}
	}
	return pCounter;
}

void readGline(char BlkDel, int linePos, std::string gLineIn) {//Parses each line of code.
	char cmmt = 0;//Initializes G Code Comments to be off.
	int rCount = 0;//Added 5-27-2018 to parse forwards instead of backwards.
	init_gNum();//Added 2-24-2019 to allow using array for G Numbers. Initializes to -1.
	int gNum_Count = 0;
	while (rCount < linePos) {
		char bitCode = gLineIn.at(rCount);
		if (bitCode == 47 && BlkDel) return;//Skip line if block delete is on.
		if (bitCode == ')') cmmt = 0;
		if (bitCode == '(') cmmt = 1;
		if (cmmt == 0) {
			if(bitCode >= 'A' && bitCode <='Z'){//If we have read an instruction.
				std::string bitNum = gLineIn.substr(rCount + 1, rCount + 9);
				switch (bitCode){
					case 'A':
						aNumber = std::stod(bitNum);
						break;
					case 'G':
						gNumber[gNum_Count] = std::stod(bitNum);
						gNum_Count++;
						break;
					case 'I':
						iNumber = std::stod(bitNum);
						break;
					case 'J':
						jNumber = std::stod(bitNum);
						break;
					case 'K':
						kNumber = std::stod(bitNum);
						break;
					case 'L':
						lNumber = std::stoi(bitNum);
						break;
					case 'M':
						mNumber = std::stoi(bitNum);
						break;
					case 'O':
						oNumber = std::stoi(bitNum);
						break;
					case 'P':
						pNumber = std::stoi(bitNum);
						break;
					case 'R':
						rNumber = std::stod(bitNum);
						break;
					case 'X':
						xNumber = std::stod(bitNum);
						break;
					case 'Y':
						yNumber = std::stod(bitNum);
						break;
					case 'Z':
						zNumber = std::stod(bitNum);
						break;
				}
			}
		}
		rCount++;
	}
}

//Webassembly code.
/*extern "C" {
 *   char* works(char* in_array, int flags){//5-27-2108 added flags for machine options.
 *      std::string str_array(in_array);
 */

 //Local C++ testing:
int main() {
	int flags = 0;//Normally imported from Webassembly.
	char BlkDel = 0;
	char M01 = 0;
	char singleB = 0;
	char flagOut[8];
	for (int iLoop = 0; iLoop < 8; ++iLoop) {//Sorts flags to be set.
		flagOut[iLoop] = (flags >> iLoop) & 1;
		if (iLoop == 0 && flagOut[iLoop]) BlkDel = 1;
		if (iLoop == 1 && flagOut[iLoop]) M01 = 1;
		if (iLoop == 2 && flagOut[iLoop]) singleB = 1;
	}
	//Load a local file instead of Webassembly array.
	std::ifstream t("C:\\Users\\Owner\\source\\repos\\Project3\\Debug\\Input.nc");
	t.seekg(0, std::ios::end);
	size_t size = t.tellg();
	std::string str_array(size, ' ');
	t.seekg(0);
	t.read(&str_array[0], size);


	size_t sPos = 0;
	size_t ePos = 0;
	ePos = str_array.find('O', sPos);//Find program beginnings.
	while (ePos != std::string::npos) {//Store all Program locations.
		if (str_array.at(ePos - 1) == '\n') {
			oLocation[oLocationIndex][0] = std::stoi(str_array.substr(ePos + 1, ePos + 9));
			oLocation[oLocationIndex][1] = ePos;
			oLocation[oLocationIndex][2] = 0;//Has Executed? 5-19-2018
			oLocationIndex++;
		}
		sPos = ePos + 1;
		ePos = str_array.find('O', sPos);//Find program beginnings.
	}
	while (oLocationIndex--) {//Send to console for debugging.
		std::cout << "Name: " << oLocation[oLocationIndex][0] << " Location: " << oLocation[oLocationIndex][1] << '\n';
	}
	sPos = 0;
	ePos = 0;
	while (ePos != std::string::npos && sPos != std::string::npos) {
		ePos = str_array.find('\n', sPos);//Find EOL.
		std::string gLine = str_array.substr(sPos, ePos - sPos); //gLine holds 1 line of G Code.
		sPos = ePos + 1;
		int i = gLine.length();
		readGline(BlkDel, i, gLine);//Parse each line.
		sPos = flowControl(str_array, sPos);
		std::cout << "Line number: " << sPos << '\n';
	}
	//Commented out for local C++.
	//return in_array;
	return 0;
	//Commented out for local C++.
	//}
}