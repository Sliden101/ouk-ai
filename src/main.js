// ffish.js test using chessgroundx
var jQueryScript = document.createElement('script');  
jQueryScript.setAttribute('src','https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js');
document.head.appendChild(jQueryScript);

const Chessground = require("chessgroundx").Chessground

const dropdownVariant = document.getElementById("dropdown-variant")
const buttonSetVariant = document.getElementById("button-set-variant")

const buttonFlip = document.getElementById("button-flip")
const buttonReset = document.getElementById("button-reset")
const buttonUndo = document.getElementById("button-undo")
const rangeVolume = document.getElementById("range-volume")
const buttonAi = document.getElementById("button-ai")

const checkboxAi = document.getElementById("check-auto-ai")
const checkboxDests = document.getElementById("check-dests")

const textFen = document.getElementById("text-fen")
const buttonSetFen = document.getElementById("button-set-fen")
const labelPgn = document.getElementById("label-pgn")

const chessgroundContainerEl = document.getElementById("chessground-container-div")
const chessgroundEl = document.getElementById("chessground-board")

const soundMove = new Audio("assets/sound/thearst3rd/move.wav")
const soundCapture = new Audio("assets/sound/thearst3rd/capture.wav")
const soundCheck = new Audio("assets/sound/thearst3rd/check.wav")
const soundTerminal = new Audio("assets/sound/thearst3rd/terminal.wav")



let ffish = null
let board = null
let chessground = null

let aiTimeout = null
let premoveTimeout = null

let positionCount = .0;
function initBoard(variant)
{
	if (board !== null)
		board.delete()

	board = new ffish.Board(variant)
	console.log("Variant:", board.variant())

	// Change css class for knightmate if needed
}

import Module from "ffish-es6"
new Module().then(loadedModule =>
{
	ffish = loadedModule
	console.log("ffish.js initialized!")

	initBoard(dropdownVariant.value)

	const config =
	{
		fen: "8/8/8/8/8/8/8/8",
		movable:
		{
			free: false,
			showDests: checkboxDests.checked,
			events:
			{
				after: afterChessgroundMove,
			},
		},
		draggable:
		{
			showGhost: true,
		},
		selectable:
		{
			enabled: false,
		},
	}
	chessground = Chessground(chessgroundEl, config)

	soundMove.volume = rangeVolume.value
	soundCapture.volume = rangeVolume.value
	soundCheck.volume = rangeVolume.value
	soundTerminal.volume = rangeVolume.value

	buttonSetVariant.onclick = function()
	{
		initBoard(dropdownVariant.value)
		updateChessground()
		chessground.cancelPremove()
		clearTimeout(aiTimeout)
		clearTimeout(premoveTimeout)

		if (checkboxAi.checked && chessground.state.orientation !== getColor(board))
			aiPlayMoveTimeout()
	}

	buttonFlip.onclick = function()
	{
		chessground.toggleOrientation()
	}
	buttonReset.onclick = function()
	{
		board.reset()
		updateChessground()
		chessground.cancelPremove()
		clearTimeout(aiTimeout)
		clearTimeout(premoveTimeout)

		if (checkboxAi.checked && chessground.state.orientation !== getColor(board))
			aiPlayMoveTimeout()
	}
	buttonUndo.onclick = function()
	{
		if (board.moveStack().length === 0)
			return
		board.pop()
		updateChessground()
		chessground.cancelPremove()
		clearTimeout(aiTimeout)
		clearTimeout(premoveTimeout)
	}
	rangeVolume.oninput = function()
	{
		soundMove.volume = rangeVolume.value
		soundCapture.volume = rangeVolume.value
		soundCheck.volume = rangeVolume.value
		soundTerminal.volume = rangeVolume.value
	}
	buttonAi.onclick = function()
	{
		// console.log(board.toString())
		aiPlayMove()

		chessground.cancelPremove()
		clearTimeout(aiTimeout)
		clearTimeout(premoveTimeout)
	}

	checkboxDests.oninput = function()
	{
		chessground.set({
			movable:
			{
				showDests: checkboxDests.checked,
			}
		})
	}

	buttonSetFen.onclick = function()
	{
		const fen = textFen.value
		if (ffish.validateFen(fen, board.variant()))
		{
			board.setFen(fen)
			updateChessground()
		}
		else
		{
			alert("Invalid FEN")
		}
	}

	updateChessground()
})

// Chessground helper functions

function getDests(board)
{
	const dests = {}
	const moves = board.legalMoves().split(" ")
	for (let i = 0; i < moves.length; i++)
	{
		const move = moves[i]
		const from = move.substring(0, 2)
		const to = move.substring(2, 4)
		if (dests[from] === undefined)
			dests[from] = []
		dests[from].push(to)
	}
	return dests
}

function getColorOrUndefined(board)
{
	if (board.isGameOver(true))
		return undefined
	return getColor(board)
}

function getColor(board)
{
	return board.turn() ? "white" : "black"
}

function getPiecesAsArray(board)
{
	// Is board.toString really the best way to get the pieces?
	const pieces = []
	const piecesLines = board.toString().split(/\r?\n/)
	for (let i = 0; i < piecesLines.length; i++)
	{
		pieces[piecesLines.length - i - 1] = piecesLines[i].split(" ")
	}
	return pieces
}

function squareGetCoords(square)
{
	if (square.length < 2)
		return [-1, -1]

	const coords = [-1, -1]
	coords[0] = parseInt(square.substring(1)) - 1
	if (coords[0] === NaN || coords[0] < 0 || coords[0] >= 1000)
		return [-1, -1]
	coords[1] = square.charCodeAt(0) - "a".charCodeAt(0)
	if (coords[1] === NaN || coords[1] < 0 || coords[1] >= 26)
		return [-1, -1]
	return coords
}

function isCapture(board, move)
{
	const pieces = getPiecesAsArray(board)

	const moveFromStr = move.charAt(0) + parseInt(move.substring(1))
	const moveToStr = move.charAt(moveFromStr.length) + parseInt(move.substring(moveFromStr.length + 1))
	const moveFrom = squareGetCoords(moveFromStr)
	const moveTo = squareGetCoords(moveToStr)

	if (pieces[moveTo[0]][moveTo[1]] !== ".")
		return true

	// En passant
	if (pieces[moveFrom[0]][moveFrom[1]].toLowerCase() === "p")
		return (moveFrom[1]) !== (moveTo[1])

	return false
}
var minimaxRoot = function(depth, board, isMaximisingPlayer) {
	console.log(board.toString())
	var newGameMoves = board.legalMoves().split(" ");
	var bestMove = -9999;
	var bestMoveFound;

	for(var i = 0; i < newGameMoves.length; i++) {
		var newGameMove = newGameMoves[i];
		board.push(newGameMove);
			var value = minimax(depth - 1, board, -10000, 10000,!isMaximisingPlayer);
		board.pop();
		if(value >= bestMove) {
			bestMove = value;
			bestMoveFound = newGameMove;
		}
	}
	return bestMoveFound;
};
  
var minimax = function (depth, board, alpha, beta, isMaximisingPlayer) {
	var newGameMoves = board.legalMoves().split(" ");

	positionCount++;
	if (depth === 0) {
		return -evaluateBoard(getPiecesAsArray(board));
	}

	if (isMaximisingPlayer) {
		var bestMove = -9999;
		for (var i = 0; i < newGameMoves.length; i++) {
			board.push(newGameMoves[i]);
			bestMove = Math.max(bestMove, minimax(depth - 1, board, alpha, beta, !isMaximisingPlayer));
			board.pop();
			alpha = Math.max(alpha, bestMove);
            if (beta <= alpha) {
                return bestMove;
            }
		}
		return bestMove;
	} else {
		var bestMove = 9999;
		for (var i = 0; i < newGameMoves.length; i++) {
			board.push(newGameMoves[i]);
			bestMove = Math.min(bestMove, minimax(depth - 1, board, alpha, beta, !isMaximisingPlayer));
			board.pop();
			beta = Math.min(beta, bestMove);
            if (beta <= alpha) {
                return bestMove;
            }
		}
		return bestMove;
	}
};


  
var evaluateBoard = function(boardArr) {
	var totalEvaluation = 0;
	for (var i = 0; i < 8; i++) {
		for (var j = 0; j < 8; j++) {
			totalEvaluation = totalEvaluation + getPieceValue(boardArr[i][j]);
		}
	}
	return totalEvaluation;
};

var getPieceValue = function (piece) {
	if (piece === ".") {
		return 0;
	}
	var getAbsoluteValue = function (piece) {
		if (piece === 'p' || piece === 'P') {
			return 10;
		} else if (piece === 'r' || piece === 'R') {
			return 50;
		} else if (piece === 'n' || piece === 'N') {
			return 35;
		} else if (piece === 's' || piece === 'S') {
			return 25 ;
		} else if (piece === 'm' || piece === 'M') {
			return 20;
		} else if (piece === 'k' || piece === 'K') {
			return 900;
		}
		throw "Unknown piece type: " + piece;
	};

	var absoluteValue = getAbsoluteValue(piece, piece.color === 'w');
	return piece == `${piece}`.toLocaleUpperCase() ? absoluteValue : -absoluteValue;
};

//Implement min max
function aiPlayMove()
{

	if (board.isGameOver(true))
		return 
	let depth = 3; 

	var d = new Date().getTime();
	let bestMove = minimaxRoot(depth, board, true);
	var d2 = new Date().getTime();
	var moveTime = (d2 - d);
	var positionsPerS = ( positionCount * 1000 / moveTime);
	
	$('#position-count').text(positionCount);
	$('#time').text(moveTime/1000 + 's');
	$('#positions-per-s').text(positionsPerS);
  
	const capture = isCapture(board, bestMove)

	board.push(bestMove)
	afterMove(capture)


}

function aiPlayMoveTimeout()
{
	if (board.isGameOver(true))
		return

	const oppColor = board.turn() ? "black" : "white"
	chessground.set({
		movable:
		{
			color: oppColor,
		},
	})
	aiTimeout = setTimeout(() =>
	{
		aiPlayMove()

		const premove = chessground.state.premovable.current
		if (premove !== undefined)
		{
			const newMoves = board.legalMoves().split(" ")
			// Check if premove is legal
			const premoveUci = premove[0] + premove[1]
			for (let i = 0; i < newMoves.length; i++)
			{
				if (newMoves[i].startsWith(premoveUci))
				{
					premoveTimeout = setTimeout(() =>
					{
						chessground.playPremove()
					}, 100)
					return
				}
			}
			chessground.cancelPremove()
		}
	}, 100)
}

function afterChessgroundMove(orig, dest, metadata)
{
	// Auto promote to queen for now
	let promotion = "p"

	// TODO, make this way better
	const move = orig + dest
	const capture = isCapture(board, move)
	if (!board.push(move))
		board.push(move + promotion)
	afterMove(capture)

	if (checkboxAi.checked)
		aiPlayMoveTimeout()
}

function afterMove(capture)
{
	updateChessground()

	if (capture)
	{
		soundCapture.currentTime = 0.0
		soundCapture.play()
	}
	else
	{
		soundMove.currentTime = 0.0
		soundMove.play()
	}

	if (board.isGameOver(true))
	{
		soundTerminal.currentTime = 0.0
		soundTerminal.play()
	}
	else if (board.isCheck())
	{
		soundCheck.currentTime = 0.0
		soundCheck.play()
	}
}

function getPgn(board)
{
	let pgn = ""
	const reversedMoves = []
	let moveStack = board.moveStack()
	while (moveStack.length > 0)
	{
		// TODO: improve this :/
		reversedMoves.push(moveStack.split(" ").pop())
		board.pop()
		moveStack = board.moveStack()
	}
	if (!board.turn() && reversedMoves.length > 0)
	{
		pgn += board.fullmoveNumber() + "... "
	}
	while (reversedMoves.length > 0)
	{
		const move = reversedMoves.pop()
		if (board.turn())
		{
			pgn += board.fullmoveNumber() + ". "
		}
		pgn += board.sanMove(move) + " "
		board.push(move)
	}

	const result = board.result(true)
	if (result !== "*")
		pgn += result

	return pgn.trim()
}

function updateChessground()
{
	textFen.value = board.fen()
	labelPgn.innerText = getPgn(board)

	chessground.set({
		fen: board.fen(),
		check: board.isCheck(),
		turnColor: getColor(board),
		movable:
		{
			color: getColorOrUndefined(board),
			dests: getDests(board),
		},
	})

	const moveStack = board.moveStack()
	if (moveStack.length === 0)
	{
		chessground.set({lastMove: undefined})
		buttonUndo.disabled = true
	}
	else
	{
		const lastMove = moveStack.split(" ").pop()
		const lastMoveFrom = lastMove.substring(0, 2)
		const lastMoveTo = lastMove.substring(2, 4)
		chessground.set({lastMove: [lastMoveFrom, lastMoveTo]})
		buttonUndo.disabled = false
	}

	if (board.isGameOver(true))
	{
		buttonAi.disabled = true
	}
	else
	{
		buttonAi.disabled = false
	}
}