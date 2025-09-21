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
  fontSize: '4.5rem',
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
  marginTop: theme.spacing(16),
  marginBottom: theme.spacing(0),
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

// Custom Image Component - Add your image URLs here
const CustomImage = ({ imageUrl, altText, width = 100, height = 100, style = {} }) => (
  <img 
    src={imageUrl}
    alt={altText}
    style={{
      width: width,
      height: height,
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      objectFit: 'cover',
      ...style
    }}
    onError={(e) => e.target.style.display = 'none'}
  />
)

const LandingPage = ({ onPlayWithFriends, onPlayOnline }) => {
  return (
    <LandingContainer>
      {/* Custom Image 1 - Top Left Corner */}
      <CustomImage 
        imageUrl="https://i.postimg.cc/650BZNyw/Grilled-Cheese.png"
        altText="Decorative image 1"
        width={300}
        height={300}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          opacity: 0.7
        }}
      />

      {/* Custom Image 2 - Top Right Corner */}
      <CustomImage 
        imageUrl="https://i.postimg.cc/Sxxk7tM9/Pizza.png"
        altText="Decorative image 2"
        width={300}
        height={300}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          opacity: 0.7
        }}
      />

      {/* Logo with Egg Icon */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
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

      {/* Custom Image 3 - Center Decorative */}
      <CustomImage 
        imageUrl="https://i.postimg.cc/yYVHsrnG/Sushi.png"
        altText="Decorative image 3"
        width={80}
        height={80}
        style={{
          marginTop: 20,
          opacity: 0.6
        }}
      />

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

      {/* Custom Image 4 - Bottom Right Corner */}
      <CustomImage 
        imageUrl="https://i.postimg.cc/MZmCPmxm/Kebab.png"
        altText="Decorative image 4"
        width={50}
        height={50}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          opacity: 0.5
        }}
      />
    </LandingContainer>
  )




  
}

export default LandingPage
