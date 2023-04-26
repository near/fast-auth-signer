import * as React from 'react'

import FastAuthController from '../lib/controller'
import { styled } from '../styles/stitches.config'

const AuthIndicator = () => {
    const isSignedIn = FastAuthController.isSignedIn()
    return (
        <StyledContainer isSignedIn={isSignedIn}>
            {isSignedIn ? <p>signed in</p> : <p>not signed in</p>}
        </StyledContainer>
    )
}

export default AuthIndicator;

const StyledContainer = styled('div', {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '$black500',
    width: 'fit-content',
    padding: '$3 $6',
    border: '1px solid $grey300',
    borderRadius: '$pill',
    cursor: 'pointer',

    '&::before': {
        content: ' ',
        position: 'absolute',
        top: '50%',
        left: '$4',
        transform: 'translate(-50%, -50%)',
        width: '12px',
        height: '12px',
        borderRadius: '$round',
        zIndex: '100',
    },


    '& > *': {
        color: '#fff',
    },

    variants: {
        isSignedIn: {
            true: {
                '&::before': {
                    backgroundColor: 'green',
                }
            },
            false: {
                '&::before': {
                    backgroundColor: 'red',
                }
            }
        }
    }
})