import React from 'react'
import { Box, Button, Typography, Divider } from '@mui/material'
import { styled } from '@mui/material/styles'

// PASTE YOUR IMAGE DATA HERE - Replace the empty string with your image data URL or base64
// Example formats:
// - Data URL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
// - Base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
// - Or use a regular image URL: "https://example.com/your-image.png"
const FRIED_EGG_IMAGE_DATA = "https://i.postimg.cc/bwd1KyT0/egg.png"

// Fried egg image component
const FriedEggIcon = () => (
  <img 
    src={FRIED_EGG_IMAGE_DATA || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZWxsaXBzZSBjeD0iMzAiIGN5PSIzMCIgcng9IjI4IiByeT0iMjUiIGZpbGw9IndoaXRlIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjMiLz4KICA8Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxMiIgZmlsbD0iI0ZGRDcwMCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjwvc3ZnPg=="} 
    alt="Fried egg" 
    style={{
      width: 100,
      height: 100,
      margin: '0 20px',
      verticalAlign: 'middle'
    }}
  />
)

// Styled components
const LandingContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: '#F3C23A', // Custom background color
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4)
}))

const LogoText = styled(Typography)(({ theme }) => ({
  fontFamily: '"Grape Nuts", cursive, "Brush Script MT", cursive',
  fontSize: '6rem',
  fontWeight: 'bold',
  color: 'black',
  lineHeight: 1,
  marginBottom: theme.spacing(4),
  marginTop: `-${theme.spacing(6)}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}))

const SubtitleText = styled(Typography)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  fontSize: '1.5rem',
  color: 'black',
  fontWeight: 400,
  textAlign: 'center',
  marginBottom: theme.spacing(6),
  textTransform: 'lowercase'
}))

const ActionButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  width: '100%',
  maxWidth: 400,
  padding: theme.spacing(2, 4),
  fontSize: '1rem',
  fontWeight: 'bold',
  borderRadius: theme.spacing(1),
  textTransform: 'lowercase',
  marginBottom: theme.spacing(3)
}))

const OrDivider = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  maxWidth: 400,
  marginBottom: theme.spacing(3),
  '& .line': {
    flex: 1,
    height: '1px',
    backgroundColor: '#D3D3D3'
  },
  '& .text': {
    fontFamily: '"Grandstander", cursive',
    padding: theme.spacing(0, 2),
    color: 'black',
    fontSize: '0.875rem',
    textTransform: 'lowercase'
  }
}))

const FooterText = styled(Typography)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  fontSize: '0.875rem',
  color: '#B8860B', // Darker yellow-brown color
  textAlign: 'center',
  marginTop: theme.spacing(8),
  textTransform: 'lowercase',
  '& a': {
    color: '#B8860B',
    textDecoration: 'underline',
    '&:hover': {
      color: '#8B6914'
    }
  }
}))

const LandingPage = ({ onPlayWithFriends, onPlayOnline }) => {
  return (
    <LandingContainer>
      {/* Logo with Egg Icon */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <LogoText>
          cooked
          <FriedEggIcon />
          kitchen
        </LogoText>
        
        <SubtitleText>
          start a new game
        </SubtitleText>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        {/* Play with Friends Button */}
        <ActionButton
          variant="contained"
          onClick={onPlayWithFriends}
          sx={{
            backgroundColor: '#424242',
            '&:hover': {
              backgroundColor: '#303030'
            }
          }}
        >
          play with friends
        </ActionButton>

        {/* OR Divider */}
        <OrDivider>
          <div className="line" />
          <span className="text">or</span>
          <div className="line" />
        </OrDivider>

        {/* Find New Friends Button */}
        <ActionButton
          variant="contained"
          onClick={onPlayOnline}
          sx={{
            backgroundColor: '#616161',
            '&:hover': {
              backgroundColor: '#424242'
            }
          }}
        >
          find new friends to play with
        </ActionButton>
      </Box>

      {/* Footer Disclaimer */}
      <FooterText>
        By continuing, you agree to our{' '}
        <a href="#" onClick={(e) => e.preventDefault()}>
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="#" onClick={(e) => e.preventDefault()}>
          Privacy Policy
        </a>
        .
      </FooterText>
    </LandingContainer>
  )
}

export default LandingPage
